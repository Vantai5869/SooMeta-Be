// routes/analytics.js
import express from 'express';
import Visit from '../models/Visit.js';
import User from '../models/User.js'; // Đảm bảo import User model
import authMiddleware from '../middleware/auth.js';
import { startOfDay, endOfDay } from 'date-fns';

const router = express.Router();

// Giữ nguyên logic POST /analytics/track-visit đã sửa đổi trước đó
// (Nó chịu trách nhiệm ghi lại/cập nhật bản ghi Visit cho mỗi người dùng/ngày)
router.post('/track-visit', authMiddleware, async (req, res) => {
    if (!req.currentUser || !req.currentUser.id) {
        return res.status(401).json({ message: 'Xác thực thất bại. Vui lòng đăng nhập.' });
    }

    const { pagePath } = req.body;
    const userId = req.currentUser.id;
    const currentTime = new Date(); // Thời điểm hiện tại

    const startOfToday = startOfDay(currentTime);
    const endOfToday = endOfDay(currentTime);

    try {
        let existingVisit = await Visit.findOne({
            user: userId,
            firstVisitAt: {
                $gte: startOfToday,
                $lte: endOfToday
            }
        });

        if (existingVisit) {
            existingVisit.lastVisitAt = currentTime;
            existingVisit.pagePath = pagePath || existingVisit.pagePath;
            existingVisit.userAgent = req.headers['user-agent'] || existingVisit.userAgent;
            await existingVisit.save();
            console.log(`Lượt truy cập của User ${userId} đã được cập nhật: lastVisitAt ${existingVisit.lastVisitAt}.`);
            res.status(200).json({ message: 'Lượt truy cập đã được cập nhật thành công.' });
        } else {
            const newVisit = new Visit({
                user: userId,
                firstVisitAt: currentTime,
                lastVisitAt: currentTime,
                pagePath: pagePath || '/',
                userAgent: req.headers['user-agent']
            });
            await newVisit.save();
            console.log(`Lượt truy cập mới của User ${userId} tại ${pagePath} đã được ghi lại.`);
            res.status(200).json({ message: 'Lượt truy cập mới đã được ghi lại thành công.' });
        }
    } catch (error) {
        console.error('Lỗi khi ghi lại/cập nhật lượt truy cập của người dùng đã đăng nhập:', error);
        res.status(500).json({ message: 'Lỗi server khi xử lý lượt truy cập.', details: error.message });
    }
});


// GET /analytics/daily-user-stats - Lấy thống kê lượt truy cập của người dùng đã đăng nhập theo ngày (chỉ dành cho admin)
router.get('/daily-user-stats', authMiddleware, async (req, res) => {
    if (!req.currentUser || req.currentUser.role !== 'admin') {
        return res.status(403).json({ message: 'Truy cập bị từ chối. Yêu cầu quyền admin.' });
    }

    try {
        const dailyStats = await Visit.aggregate([
            {
                $group: {
                    _id: { // Nhóm theo năm, tháng, ngày của firstVisitAt
                        year: { $year: "$firstVisitAt" },
                        month: { $month: "$firstVisitAt" },
                        day: { $dayOfMonth: "$firstVisitAt" }
                    },
                    totalUniqueUsers: { $sum: 1 }, // Mỗi bản ghi là 1 người dùng duy nhất trong ngày đó
                    // THAY ĐỔI LỚN NHẤT: Thu thập tất cả các user ID duy nhất trong ngày
                    userIds: { $push: "$user" }, // Đẩy ID của người dùng vào một mảng
                    // Thêm firstVisitAt và lastVisitAt (tùy chọn, để hiển thị trong bảng chi tiết)
                    firstVisitTime: { $min: "$firstVisitAt" },
                    lastVisitTime: { $max: "$lastVisitAt" }
                }
            },
            {
                $project: {
                    _id: 0,
                    date: {
                        $dateFromParts: {
                            year: "$_id.year",
                            month: "$_id.month",
                            day: "$_id.day"
                        }
                    },
                    uniqueUsersCount: "$totalUniqueUsers",
                    userIds: 1, // Giữ lại mảng user IDs
                    firstVisitTime: 1, // Giữ lại thời gian truy cập đầu tiên của nhóm
                    lastVisitTime: 1 // Giữ lại thời gian truy cập cuối cùng của nhóm
                }
            },
            // THAY ĐỔI LỚN THỨ HAI: Sử dụng $lookup để "join" với collection User
            {
                $lookup: {
                    from: 'users', // Tên collection của User model (thường là số nhiều, chữ thường: 'users')
                    localField: 'userIds', // Trường trong pipeline hiện tại chứa các user ID
                    foreignField: '_id', // Trường ID trong collection 'users'
                    as: 'usersData' // Tên của trường mới sẽ chứa thông tin User đã join
                }
            },
            {
                $project: {
                    date: 1,
                    uniqueUsersCount: 1,
                    firstVisitTime: 1,
                    lastVisitTime: 1,
                    users: { // Chọn các trường cụ thể từ usersData để tránh gửi quá nhiều thông tin
                        $map: {
                            input: "$usersData",
                            as: "user",
                            in: {
                                _id: "$$user._id",
                                email: "$$user.email",
                                name: "$$user.name",
                                role: "$$user.role",
                                subscriptionTier: "$$user.subscriptionTier"
                                // Thêm các trường khác của User mà bạn muốn hiển thị
                            }
                        }
                    }
                }
            },
            {
                $sort: { date: 1 }
            }
        ]);
        res.status(200).json(dailyStats);
    } catch (error) {
        console.error('Lỗi khi lấy thống kê lượt truy cập hàng ngày:', error);
        res.status(500).json({ message: 'Lỗi server khi lấy thống kê lượt truy cập.', details: error.message });
    }
});

export default router;