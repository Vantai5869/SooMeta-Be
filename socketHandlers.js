// socketHandlers.js
import { v4 as uuidv4 } from 'uuid';

// Lưu trữ thông tin người dùng đang kết nối
// Key là socket.id, value là thông tin user
const connectedUsers = new Map();

function broadcastVisitorData(io) {
  const allUsersArray = Array.from(connectedUsers.values());
  
  // Lọc ra chỉ những người dùng không phải là admin để hiển thị cho admin
  // Hoặc bạn có thể gửi tất cả và để client admin tự lọc
  const publicUsers = allUsersArray.filter(user => user.type !== 'admin');

  const visitorData = {
    count: publicUsers.length, // Số lượng người dùng thực tế (không tính admin)
    users: publicUsers.map(user => ({ // Chỉ gửi thông tin của người dùng không phải admin
        id: user.id,
        displayInfo: user.displayInfo,
        email: user.email, // << Quan trọng: Server cần gửi trường này
        connectedAt: user.connectedAt,
        ip: user.ip,
        type: user.type,
    })),
    // totalConnections: allUsersArray.length, // Nếu admin muốn xem cả tổng số kết nối
  };
  // Gửi dữ liệu tới tất cả các client đang kết nối (hoặc tới một room 'admins' cụ thể)
  io.emit('VISITOR_DATA', visitorData);
}

// Middleware xác thực (ví dụ)
// const authenticateSocket = (socket, next) => {
//   const token = socket.handshake.auth.token;
//   // ... (logic xác thực token của bạn)
//   // if (valid) {
//   //   socket.userData = decodedToken;
//   //   next();
//   // } else {
//   //   next(new Error('Authentication error'));
//   // }
//   next(); // Bỏ qua xác thực cho ví dụ này
// };

export default function initializeSocketIO(io) {
  // io.use(authenticateSocket); // Áp dụng middleware nếu có

  io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}, IP: ${socket.handshake.address}`);

    // Thông tin người dùng mặc định, sẽ được cập nhật
    let userDetails = {
      id: socket.id,
      displayInfo: `Connecting-${socket.id.substring(0, 6)}`,
      ip: socket.handshake.address,
      connectedAt: new Date().toISOString(),
      type: 'unknown', // Sẽ được cập nhật thành 'guest', 'user', hoặc 'admin'
    };
    connectedUsers.set(socket.id, userDetails); // Thêm vào map ngay, sẽ cập nhật sau

    // Admin tự định danh
    socket.on('USER_IDENTIFIED', (data) => { // Cho ADMIN
      const adminDetails = connectedUsers.get(socket.id);
      if (adminDetails && data) {
        adminDetails.id = data.userId || adminDetails.id;
        adminDetails.displayInfo = data.name || `Admin-${(data.userId || socket.id).substring(0,6)}`;
        adminDetails.type = 'admin'; // Đánh dấu là admin
        connectedUsers.set(socket.id, adminDetails);
        console.log(`Admin ${socket.id} identified as ${adminDetails.displayInfo}`);
        // Không broadcast ở đây, vì admin không nên nằm trong danh sách "visitor" cho chính họ xem
        // broadcastVisitorData(io) sẽ được gọi khi người dùng thường kết nối/ngắt kết nối
      }
    });

    // Người dùng từ trang chủ kết nối
    socket.on('USER_CAME_ONLINE', (data) => { // Cho người dùng TRANG CHỦ
      const homepageUserDetails = connectedUsers.get(socket.id);
      if (homepageUserDetails && data) {
        homepageUserDetails.id = data.userId || socket.id; // Nếu là user đã login, dùng userId
        homepageUserDetails.displayInfo = data.name || (data.type === 'guest' ? `Guest-${socket.id.substring(0,6)}` : `User-${(data.userId || socket.id).substring(0,6)}`);
        homepageUserDetails.type = data.type || 'user'; // 'guest' hoặc 'user' (đã login)
        
        connectedUsers.set(socket.id, homepageUserDetails);
        console.log(`Homepage ${homepageUserDetails.type} ${socket.id} came online as ${homepageUserDetails.displayInfo}`);
        broadcastVisitorData(io); // Cập nhật cho admin
      }
    });
    
    // Gửi thông tin ban đầu sau một khoảng trễ nhỏ để chờ USER_CAME_ONLINE hoặc USER_IDENTIFIED
    // Hoặc client tự yêu cầu dữ liệu ban đầu nếu cần.
    // Trong trường hợp này, broadcastVisitorData() sẽ được gọi bởi USER_CAME_ONLINE.
    // Nếu không có event nào được gửi từ client, client đó vẫn được tính là 'unknown'
    // và sẽ được broadcast.
    // console.log(`Initial broadcast after client ${socket.id} connected.`);
    // broadcastVisitorData(io); // Cân nhắc việc gọi ở đây hoặc chỉ dựa vào event từ client


    socket.on('disconnect', (reason) => {
      const disconnectedUser = connectedUsers.get(socket.id);
      if (disconnectedUser) {
          console.log(`Client ${disconnectedUser.displayInfo} (ID: ${socket.id}, Type: ${disconnectedUser.type}) disconnected. Reason: ${reason}.`);
          connectedUsers.delete(socket.id);
          // Chỉ broadcast nếu người ngắt kết nối không phải là admin,
          // hoặc nếu bạn muốn admin cũng biết các admin khác online/offline
          if (disconnectedUser.type !== 'admin') {
            broadcastVisitorData(io);
          }
      } else {
          console.log(`Client ${socket.id} (unknown type) disconnected. Reason: ${reason}.`);
          connectedUsers.delete(socket.id); // Xóa nếu có trong map
          broadcastVisitorData(io); // Vẫn broadcast vì có thể là user chưa kịp định danh
      }
    });

    socket.on('error', (error) => {
      console.error(`Socket.IO error for client ${socket.id}:`, error);
    });
  });

  console.log('Socket.IO initialized and listening for connections.');
}
