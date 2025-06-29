// routes/progressStats.js
import express from 'express';
import ExamSession from '../models/ExamSession.js'; // Model ExamSession của bạn
import authMiddleware from '../middleware/auth.js';   // Middleware xác thực

const router = express.Router();

router.get('/', authMiddleware, async (req, res) => {
    try {
        if (!req.currentUser || !req.currentUser.id) {
            return res.status(401).json({ message: 'Xác thực thất bại.' });
        }
        const userId = req.currentUser.id;

        const userSessions = await ExamSession.find({ userId }).sort({ submittedAt: 'asc' });

        if (userSessions.length === 0) {
            return res.json({
                totalExamsTaken: 0,
                overallAverageScorePercentage: 0,
                averageBySkill: {},
                averageByLevel: {},
                scoreProgression: [],
            });
        }

        const totalExamsTaken = userSessions.length;
        let totalScoreSum = 0;
        let totalPossibleScoreSum = 0;
        const skillScores = {}; // { "Đọc": { totalScore: X, totalPossible: Y, count: Z }, ... }
        const levelScores = {}; // { "TOPIK I": { totalScore: X, totalPossible: Y, count: Z }, ... }

        const scoreProgression = userSessions.map(session => {
            totalScoreSum += session.score;
            totalPossibleScoreSum += session.totalQuestions;

            const skill = session.examMeta?.skill;
            if (skill) {
                if (!skillScores[skill]) skillScores[skill] = { totalScore: 0, totalPossible: 0, count: 0 };
                skillScores[skill].totalScore += session.score;
                skillScores[skill].totalPossible += session.totalQuestions;
                skillScores[skill].count += 1;
            }

            const level = session.examMeta?.level;
            if (level) {
                if (!levelScores[level]) levelScores[level] = { totalScore: 0, totalPossible: 0, count: 0 };
                levelScores[level].totalScore += session.score;
                levelScores[level].totalPossible += session.totalQuestions;
                levelScores[level].count += 1;
            }
            
            return {
                date: session.submittedAt,
                examName: session.examMeta?.description || `Đề ${session.examId}`,
                score: session.score,
                totalQuestions: session.totalQuestions,
                percentage: totalPossibleScoreSum > 0 ? parseFloat(((session.score / session.totalQuestions) * 100).toFixed(1)) : 0,
            };
        });

        const overallAverageScorePercentage = totalPossibleScoreSum > 0 
            ? parseFloat(((totalScoreSum / totalPossibleScoreSum) * 100).toFixed(1)) 
            : 0;

        const averageBySkill = {};
        for (const skill in skillScores) {
            averageBySkill[skill] = skillScores[skill].totalPossible > 0
                ? parseFloat(((skillScores[skill].totalScore / skillScores[skill].totalPossible) * 100).toFixed(1))
                : 0;
        }

        const averageByLevel = {};
        for (const level in levelScores) {
            averageByLevel[level] = levelScores[level].totalPossible > 0
                ? parseFloat(((levelScores[level].totalScore / levelScores[level].totalPossible) * 100).toFixed(1))
                : 0;
        }

        res.json({
            totalExamsTaken,
            overallAverageScorePercentage,
            averageBySkill,
            averageByLevel,
            scoreProgression,
        });

    } catch (error) {
        console.error("Error in GET /progress-stats:", error);
        res.status(500).json({ message: 'Lỗi máy chủ khi lấy dữ liệu thống kê tiến độ.', details: error.message });
    }
});

export default router;