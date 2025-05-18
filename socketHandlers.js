// socketHandlers.js
import { v4 as uuidv4 } from 'uuid';

// Lưu trữ thông tin người dùng đang kết nối
// Key là socket.id, value là thông tin user
const connectedUsers = new Map();

function broadcastVisitorData(io) {
  const visitorData = {
    count: connectedUsers.size,
    users: Array.from(connectedUsers.values()).map(user => ({
        id: user.id,
        displayInfo: user.displayInfo,
        connectedAt: user.connectedAt,
        ip: user.ip, // Thêm IP nếu muốn hiển thị
        // Thêm các thông tin khác nếu server có
    })),
  };
  // Gửi dữ liệu tới tất cả các client đang kết nối
  io.emit('VISITOR_DATA', visitorData);
}

// Middleware xác thực cho Socket.IO (ví dụ, bạn cần hoàn thiện logic này)
// const authenticateSocket = (socket, next) => {
//   const token = socket.handshake.auth.token;
//   // Hoặc: const token = socket.handshake.headers['x-auth-token'];

//   // Ví dụ logic kiểm tra token (thay thế bằng logic thực tế của bạn)
//   // import jwt from 'jsonwebtoken';
//   // if (token) {
//   //   try {
//   //     const decoded = jwt.verify(token, process.env.JWT_SECRET); // JWT_SECRET từ .env
//   //     socket.userData = decoded; // Gắn thông tin user đã giải mã vào socket object
//   //     return next();
//   //   } catch (err) {
//   //     console.error("Socket authentication error:", err.message);
//   //     return next(new Error('Authentication error: Invalid token'));
//   //   }
//   // } else {
//   //   return next(new Error('Authentication error: No token provided'));
//   // }
//   // Bỏ qua xác thực cho ví dụ này, cho phép tất cả kết nối
//    next();
// };


export default function initializeSocketIO(io) {
  // Áp dụng middleware xác thực (nếu có)
  // io.use(authenticateSocket);

  io.on('connection', (socket) => {
    // Thông tin người dùng mặc định khi mới kết nối
    let userDetails = {
      id: socket.id,
      displayInfo: `Guest-${socket.id.substring(0, 6)}`,
      ip: socket.handshake.address, // Địa chỉ IP của client
      connectedAt: new Date().toISOString(),
    };

    // Nếu bạn dùng middleware xác thực và đã gắn userData vào socket:
    // if (socket.userData) {
    //   userDetails.id = socket.userData.userId || socket.id; // Ưu tiên userId từ token
    //   userDetails.displayInfo = socket.userData.email || socket.userData.name || `User-${socket.userData.userId.substring(0,6)}`;
    //   userDetails.role = socket.userData.role; // Lưu vai trò nếu cần
    // }

    connectedUsers.set(socket.id, userDetails);
    console.log(`Client ${userDetails.displayInfo} (ID: ${socket.id}, IP: ${userDetails.ip}) connected. Total: ${connectedUsers.size}`);

    broadcastVisitorData(io); // Gửi dữ liệu cập nhật cho tất cả client

    // Lắng nghe sự kiện 'USER_IDENTIFIED' từ client (ví dụ: admin gửi thông tin của họ)
    socket.on('USER_IDENTIFIED', (data) => {
      const currentUserDetails = connectedUsers.get(socket.id);
      if (currentUserDetails && data) {
        // Chỉ cập nhật nếu thông tin được cung cấp và khác với thông tin mặc định
        // hoặc nếu đây là thông tin từ người dùng đã xác thực (ví dụ: admin)
        currentUserDetails.id = data.userId || currentUserDetails.id;
        currentUserDetails.displayInfo = data.name || `User-${(data.userId || socket.id).substring(0,6)}`;
        // currentUserDetails.role = data.role; // Cập nhật vai trò
        
        connectedUsers.set(socket.id, currentUserDetails);
        console.log(`User ${socket.id} identified as ${currentUserDetails.displayInfo}`);
        broadcastVisitorData(io); // Cập nhật lại cho mọi người
      }
    });

    socket.on('disconnect', (reason) => {
      const disconnectedUser = connectedUsers.get(socket.id);
      if (disconnectedUser) {
          console.log(`Client ${disconnectedUser.displayInfo} (ID: ${socket.id}) disconnected. Reason: ${reason}. Total: ${connectedUsers.size - 1 }`);
      } else {
          console.log(`Client ${socket.id} disconnected. Reason: ${reason}.`);
      }
      connectedUsers.delete(socket.id);
      broadcastVisitorData(io);
    });

    socket.on('error', (error) => {
      console.error(`Socket.IO error for client ${socket.id}:`, error);
    });

    // Thêm các trình xử lý sự kiện Socket.IO khác ở đây nếu cần
    // socket.on('chat_message', (msg) => {
    //   io.emit('chat_message', msg); // Ví dụ: broadcast tin nhắn chat
    // });
  });

  console.log('Socket.IO initialized and listening for connections.');
}
