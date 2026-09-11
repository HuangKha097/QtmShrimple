# Shrimple

Shrimple là ứng dụng mạng xã hội full-stack kết hợp nhắn tin thời gian thực, được xây dựng với React, Express, Socket.IO và MongoDB.

## Điểm nổi bật

- **Xác thực:** đăng ký/đăng nhập bằng email và mật khẩu, đăng nhập Google, quên mật khẩu bằng OTP.
- **Hồ sơ và quan hệ:** quản lý hồ sơ cá nhân, kết bạn và chặn người dùng.
- **Nhắn tin trực tiếp và nhóm:** gửi nội dung và media, reaction, thu hồi, xóa, ghim, chuyển tiếp, trạng thái đã đọc và trạng thái online.
- **Cuộc gọi:** gọi thoại/video ngang hàng bằng WebRTC; server chuyển tiếp tín hiệu thiết lập cuộc gọi qua Socket.IO.
- **Nội dung xã hội:** bài đăng, bảng tin, bình luận, reaction, nội dung đã lưu và bảng tin video ngắn.
- **Cá nhân hóa:** giao diện sáng/tối và các thiết lập người dùng.
- **Anti-Peep (DEMO):** hỗ trợ phát hiện khuôn mặt và khóa PIN để giảm nguy cơ người khác nhìn trộm nội dung.
- **Phân loại tin tiếng Việt tùy chọn:** mô hình TF-IDF/Random Forest đưa ra dự đoán mang tính heuristic. Kết quả không phải bằng chứng khẳng định một nội dung đúng hay sai và không thay thế việc kiểm chứng nguồn tin.

## Kiến trúc tổng quan

~~~text
React 19 + Vite
    │
    ├── REST qua Axios ───────────────┐
    ├── sự kiện thời gian thực ───────┤
    └── WebRTC media ngang hàng       │
                                      ▼
                         Node.js + Express 5 + Socket.IO
                              │          │
                              │          ├── Cloudinary / email
                              │          └── Python ML tùy chọn
                              ▼
                           MongoDB
~~~

Client gọi REST để xử lý dữ liệu nghiệp vụ và dùng Socket.IO cho trạng thái thời gian thực cũng như signaling WebRTC. Âm thanh/video cuộc gọi đi trực tiếp giữa các peer sau khi kết nối được thiết lập; server không phải media server.

## Công nghệ

| Phần | Công nghệ chính |
|---|---|
| Client | React 19, Vite 7, React Router, Zustand, Axios, Socket.IO Client, simple-peer |
| Giao diện | Sass, Framer Motion, Lucide, Sonner |
| Form và xác thực client | React Hook Form, Zod, <code>@react-oauth/google</code> |
| Anti-Peep | <code>@vladmandic/face-api</code> |
| Server | Node.js ESM, Express 5, Socket.IO 4 |
| Dữ liệu và media | Mongoose 8, MongoDB, Multer, Cloudinary |
| Xác thực và email | JWT, bcrypt, cookie-parser, Google Auth Library, Nodemailer |
| ML tùy chọn | Python, joblib, Pyvi, NumPy, scikit-learn; pandas/openpyxl phục vụ chủ yếu cho huấn luyện |

## Yêu cầu trước khi chạy

- Git.
- Phiên bản Node.js LTS hiện hành và npm.
- MongoDB có thể truy cập từ máy chạy backend.
- Tài khoản/cấu hình Cloudinary nếu sử dụng tải media.
- Google OAuth nếu sử dụng đăng nhập Google.
- Dịch vụ email hoặc SMTP nếu muốn gửi OTP qua email.
- Python và các gói ML nếu bật bộ phân loại tin tiếng Việt.

## Khởi động nhanh

Các lệnh dưới đây chạy từ thư mục gốc repository bằng PowerShell.

### 1. Cài dependency

~~~powershell
npm --prefix .\client install
npm --prefix .\server install
~~~

### 2. Tạo tệp môi trường cục bộ

~~~powershell
Copy-Item -LiteralPath ".\client\.env.example" -Destination ".\client\.env.development"
Copy-Item -LiteralPath ".\server\.env.example" -Destination ".\server\.env"
~~~

Mở hai tệp vừa tạo và thay placeholder bằng cấu hình của môi trường của bạn. Không chia sẻ hoặc commit giá trị thật.

### 3. Chạy backend trong terminal riêng

~~~powershell
Set-Location .\server
npm run dev
~~~

Backend phải được chạy với <code>server/</code> là thư mục làm việc vì một số đường dẫn tương đối đến upload và model phụ thuộc vào thư mục hiện tại. Cổng mặc định là <http://localhost:5001>.

### 4. Chạy frontend trong terminal khác

~~~powershell
Set-Location .\client
npm run dev
~~~

Mở URL mà Vite in trong terminal. Cổng có thể đổi nếu cổng mặc định của Vite đang bận.

## Biến môi trường

### Client

Các khóa được khai báo mẫu trong <code>client/.env.example</code> và giá trị development nằm trong <code>client/.env.development</code>.

| Biến | Mục đích |
|---|---|
| <code>VITE_API_URL</code> | Base URL cho REST API |
| <code>VITE_SOCKET_URL</code> | URL kết nối Socket.IO |
| <code>VITE_ASSET_BASE_URL</code> | Base URL cho asset/media |
| <code>VITE_GOOGLE_CLIENT_ID</code> | Google Web Client ID dùng ở trình duyệt |

Vite đưa các biến <code>VITE_*</code> vào bundle trình duyệt, vì vậy người dùng có thể xem chúng. Google Client ID có thể công khai, nhưng client secret, MongoDB URI, khóa ký JWT, token và mật khẩu tuyệt đối không được đặt trong biến <code>VITE_*</code>.

### Server

Các khóa được khai báo trong <code>server/.env.example</code>; giá trị thật của máy cục bộ nằm trong <code>server/.env</code>.

| Biến | Bắt buộc | Mục đích |
|---|---|---|
| <code>PORT</code> | Không | Cổng backend; mặc định 5001 |
| <code>CLIENT_ORIGINS</code> | Có khi chạy khác origin | Danh sách origin client được CORS cho phép |
| <code>MONGODB_CONNECTIONSTRING</code> | Có | Chuỗi kết nối MongoDB |
| <code>MONGODB_DNS_SERVERS</code> | Không | Danh sách DNS phân cách bằng dấu phẩy cho truy vấn MongoDB SRV |
| <code>ACCESS_TOKEN_SECRET</code> | Có | Bí mật ký/xác minh access token |
| <code>CLOUDINARY_CLOUD_NAME</code> | Cho media Cloudinary | Tên cloud |
| <code>CLOUDINARY_API_KEY</code> | Cho media Cloudinary | API key |
| <code>CLOUDINARY_API_SECRET</code> | Cho media Cloudinary | API secret; chỉ giữ ở server |
| <code>GOOGLE_CLIENT_ID</code> | Cho Google Login | Audience mà backend chấp nhận khi xác minh ID token |
| <code>EMAIL_SERVICE</code> | Cho gửi email | Tên dịch vụ email được Nodemailer dùng |
| <code>EMAIL_USER</code> | Cho gửi email | Tài khoản gửi |
| <code>EMAIL_PASS</code> | Cho gửi email | Mật khẩu hoặc app password |
| <code>EMAIL_HOST</code> | Không | SMTP host tùy chỉnh |
| <code>EMAIL_PORT</code> | Không | SMTP port tùy chỉnh |
| <code>EMAIL_SECURE</code> | Không | Chế độ kết nối SMTP bảo mật |

Trong cấu hình một Google Web Client hiện tại, <code>VITE_GOOGLE_CLIENT_ID</code> và <code>GOOGLE_CLIENT_ID</code> phải khớp chính xác. Sau khi đổi env server, hãy khởi động lại backend; sau khi đổi env client, hãy khởi động lại Vite hoặc rebuild frontend.

Các tệp env thật được Git bỏ qua. Hai tệp <code>.env.example</code> chỉ chứa placeholder và được commit để mô tả cấu hình cần thiết.

## npm scripts

### Client

| Lệnh | Mục đích |
|---|---|
| <code>npm run dev</code> | Chạy Vite development server |
| <code>npm run build</code> | Tạo production build |
| <code>npm run lint</code> | Chạy ESLint |
| <code>npm run preview</code> | Xem thử production build cục bộ |

### Server

| Lệnh | Mục đích |
|---|---|
| <code>npm run dev</code> | Chạy backend ở chế độ phát triển |
| <code>npm start</code> | Khởi động backend bằng Node.js |

Hiện tại cả client và server chưa khai báo npm script cho kiểm thử tự động.

## Cấu trúc chính

~~~text
.
├── client/
│   ├── public/                  # asset công khai và cấu hình redirect
│   ├── src/
│   │   ├── auth/               # bảo vệ route
│   │   ├── components/         # UI theo tính năng
│   │   ├── config/             # truy cập cấu hình client
│   │   ├── lib/                # hạ tầng client
│   │   ├── pages/              # màn hình ứng dụng
│   │   ├── services/           # lớp gọi API
│   │   └── stores/             # Zustand stores
│   └── .env.example
├── server/
│   ├── public/uploads/         # upload tạm ở runtime
│   ├── src/
│   │   ├── algorithms/         # bộ phân loại ML tùy chọn
│   │   ├── controllers/        # xử lý request
│   │   ├── libs/               # kết nối và tiện ích
│   │   ├── models/             # Mongoose models
│   │   └── routes/             # REST route groups
│   ├── server.js               # entrypoint
│   └── .env.example
└── docs/                       # tài liệu kỹ thuật
~~~

## Tổng quan API

Backend tổ chức REST API theo các nhóm sau:

| Nhóm | Phạm vi |
|---|---|
| <code>/api/auth</code> | Đăng ký, đăng nhập và khôi phục tài khoản |
| <code>/api/users</code> | Hồ sơ và dữ liệu người dùng |
| <code>/api/friends</code> | Quan hệ bạn bè và chặn người dùng |
| <code>/api/messages</code> | Tin nhắn và thao tác trên tin nhắn |
| <code>/api/conversations</code> | Hội thoại trực tiếp và nhóm |
| <code>/api/posts</code> | Bài đăng, feed và tương tác |

Các nhóm nghiệp vụ được bảo vệ bằng xác thực; nhóm auth là điểm vào công khai. Chi tiết payload và response nên được đối chiếu trực tiếp với route/controller tương ứng khi tích hợp.

## ML tiếng Việt tùy chọn

Model nằm tại <code>server/src/algorithms/TF-IDF_RandomForest/</code>. Node.js gọi lệnh <code>python</code> từ <code>PATH</code>, vì vậy cần kiểm tra Python có thể được gọi bằng đúng tên này trong terminal chạy server.

~~~powershell
python -m pip install joblib pyvi numpy scikit-learn pandas openpyxl
~~~

<code>joblib</code>, <code>pyvi</code>, <code>numpy</code> và khả năng tương thích <code>scikit-learn</code> phục vụ inference. <code>pandas</code> và <code>openpyxl</code> chủ yếu cần cho quy trình huấn luyện/xử lý dữ liệu. Hãy giữ phiên bản thư viện tương thích với artifact model đã tạo.

## Build và triển khai

Kiểm tra frontend trước khi phát hành:

~~~powershell
Set-Location .\client
npm run lint
npm run build
~~~

<code>client/public/_redirects</code> cung cấp quy tắc proxy API và SPA fallback theo kiểu Netlify. Khi dùng nền tảng khác, cần chuyển các quy tắc tương đương sang cấu hình của nền tảng đó.

Khi triển khai backend:

- Cấu hình env bằng secret manager của nền tảng, không đưa tệp env thật vào image hoặc repository.
- Giới hạn <code>CLIENT_ORIGINS</code> về đúng domain frontend.
- Dùng HTTPS. Quyền camera/microphone, WebRTC và secure cookie cần secure context trong production.
- Bảo đảm thư mục làm việc và đường dẫn runtime cho upload/model phù hợp.
- Không có live deployment nào được tuyên bố trong tài liệu này.

## Bảo mật và mức độ sẵn sàng production

- Không commit env thật, token, credential, MongoDB URI hoặc secret.
- Giới hạn CORS và MongoDB Atlas IP allow-list theo hạ tầng thực tế.
- Ở môi trường thiếu SMTP, luồng hiện tại có thể ghi OTP ra console để hỗ trợ phát triển. Phải thay đổi hành vi này trước production.
- Rà soát xác thực, phân quyền, rate limiting và kiểm tra file upload trước khi mở hệ thống công khai.
- Thiết lập logging, giám sát, backup và quy trình rotate secret.
- Dự án vẫn cần production hardening; hãy thực hiện security review phù hợp trước khi xử lý dữ liệu thật.

## Đóng góp và quy trình phát triển

1. Tạo nhánh riêng cho thay đổi.
2. Giữ secret ngoài Git và cập nhật tệp <code>.env.example</code> nếu thêm biến cấu hình.
3. Chạy lint/build cho phần bị ảnh hưởng.
4. Kiểm tra thủ công các luồng thời gian thực, OAuth, upload hoặc WebRTC liên quan.
5. Cập nhật tài liệu khi hành vi, cấu hình hoặc API thay đổi.
6. Gửi thay đổi để review trước khi merge.
