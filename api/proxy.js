import axios from 'axios';

export default async function handler(req, res) {
  // 1. Tách biến 'match' ra khỏi query params
  // 'match' là do cấu hình trong vercel.json sinh ra
  const { match, ...initialQuery } = req.query;

  // 2. [QUAN TRỌNG] Tạo bộ lọc params sạch sẽ
  // Copy ra object mới để thao tác xóa
  const cleanQuery = { ...initialQuery };

  // XÓA CÁC THAM SỐ RÁC GÂY LỖI GOOGLE
  // Nếu vercel bắt route /v1:uploadUserImage, nó thường nhét cái key 'uploadUserImage' vào query
  delete cleanQuery.uploadUserImage; 
  delete cleanQuery[':uploadUserImage'];
  delete cleanQuery.path; // Xóa luôn biến path nếu có dư thừa

  // 3. Xây dựng URL đích
  // Nếu match là mảng (path sâu) thì nối lại, nếu là chuỗi thì giữ nguyên
  const pathSuffix = Array.isArray(match) ? match.join('/') : match;

  // Logic xử lý dấu "/" hoặc "":
  // Nếu path bắt đầu bằng ":" (vd: :uploadUserImage) -> Không thêm "/"
  // Nếu path bình thường -> Thêm "/"
  let separator = '/';
  if (pathSuffix && pathSuffix.startsWith(':')) {
      separator = '';
  }

  // URL cuối cùng
  const targetUrl = `https://aisandbox-pa.googleapis.com/v1${separator}${pathSuffix}`;
  
  const googleToken = process.env.VITE_GOOGLE_LABS_TOKEN;

  console.log(`[Proxy] Forwarding to: ${targetUrl}`);
  // console.log(`[Proxy] Params gửi đi:`, cleanQuery); // Mở comment nếu muốn debug params

  try {
    const response = await axios({
      method: req.method,
      url: targetUrl,
      data: req.body,
      params: cleanQuery, // Gửi bộ params đã lọc sạch
      headers: {
        'Authorization': `Bearer ${googleToken}`,
        'Origin': 'https://labs.google',
        'Referer': 'https://labs.google/',
        // Ưu tiên Content-Type gốc của client gửi lên (quan trọng khi upload file/buffer)
        // Nếu không có mới fallback về application/json
        'Content-Type': req.headers['content-type'] || 'application/json',
      },
      // Force nhận JSON để hứng lỗi chi tiết nếu có
      responseType: 'json' 
    });

    // Trả kết quả thành công về frontend
    res.status(response.status).json(response.data);
    
  } catch (error) {
    // LOG LỖI CHI TIẾT
    console.error("[Proxy Error] Message:", error.message);
    
    if (error.response) {
      // Log payload lỗi từ Google trả về để biết đường sửa
      console.error("[Proxy Error] Google Payload:", JSON.stringify(error.response.data));
      
      // Trả nguyên lỗi đó về cho Frontend hiển thị
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({ error: "Internal Server Error", details: error.message });
    }
  }
}