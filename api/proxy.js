import axios from 'axios';

export default async function handler(req, res) {
  // Lấy phần đường dẫn phía sau /v1/
  // Ví dụ request gốc: /v1/projects/xyz... -> path dư là projects/xyz...
  const { path } = req.query; 
  
  // Hoặc nếu bạn dùng rewrite rule bên dưới thì req.url sẽ chứa đầy đủ
  // Ta cần xử lý thủ công xíu để ghép URL đích
  // Logic: Lấy URL đích = Base Google URL + phần đuôi của request hiện tại
  
  // Mẹo: Dùng replace để xóa prefix '/v1' nếu nó còn dính trong url
  const cleanUrl = req.url.replace(/^\/api\/proxy/, '').replace(/^\/v1/, '');
  const targetUrl = `https://aisandbox-pa.googleapis.com/v1${cleanUrl}`;

  console.log(`[Proxy] Forwarding to: ${targetUrl}`); // Log này sẽ hiện trên Vercel!

  try {
    const response = await axios({
      method: req.method,
      url: targetUrl,
      data: req.body,
      headers: {
        // QUAN TRỌNG: Fake header để vượt qua check của Google
        'Origin': 'https://labs.google',
        'Referer': 'https://labs.google/',
        'Content-Type': 'application/json',
        // Copy thêm Cookie nếu cần thiết (thường API public sandbox k cần)
      },
    });

    // Trả kết quả thành công về frontend
    res.status(response.status).json(response.data);
    
  } catch (error) {
    // ĐÂY LÀ CHỖ GIÚP BẠN ĐỌC LOG
    console.error("[Proxy Error] Message:", error.message);
    
    if (error.response) {
      console.error("[Proxy Error] Google Response:", JSON.stringify(error.response.data));
      // Trả lỗi chi tiết về frontend để debug
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({ error: "Internal Server Error", details: error.message });
    }
  }
}