/**
 * ============================================================================
 * TỆP CẤU HÌNH DỰ ÁN 20/10 (js/config.js)
 * Chứa toàn bộ dữ liệu cá nhân hóa: Mã PIN, gợi ý, tâm thư, 6 ảnh kỷ niệm và âm thanh
 * ============================================================================
 */

window.PROJECT_CONFIG = {
    // 1. Thông tin người nhận & người gửi
    recipientName: "Cô Gái Tháng Mười",
    recipientInitial: "L", // Chữ cái in trên dấu sáp niêm phong phong bì
    senderSignature: "Người bạn luôn trân quý bạn",
    eventDate: "Ngày 20 tháng 10 năm 2026",

    // 2. Cấu hình Giai đoạn 1: Mã PIN & Hệ thống gợi ý cấp tiến
    security: {
        pinCode: "2010", // 4 chữ số mật khẩu
        musicBoxNotes: [523.25, 659.25, 783.99, 1046.50], // Nốt nhạc khi bấm đúng 4 số (C5 - E5 - G5 - C6)
        hints: [
            "“Hãy chạm vào 4 nốt nhạc mở ra ngày đặc biệt của một nửa thế giới...”",
            "“Ái chà, hơi lệch nhịp rồi! Gợi ý nhỏ nhé: Ngày 20 tháng 10 viết liền 4 số là gì nhỉ? 🤭”",
            "“Mảnh ký ức mờ ảo đã hiện lên ở góc dưới kìa! Nhập 2 - 0 - 1 - 0 để mở cửa nhé ✨”",
            "“Vết nứt Kintsugi ánh vàng đã tự động hàn gắn cánh cửa ký ức cho bạn rồi đây!”"
        ]
    },

    // 3. Cấu hình Giai đoạn 3: Nội dung Bức Thư Tay Sống Động
    letter: {
        salutation: "Gửi người bạn của tớ,",
        paragraphs: [
            "Nhân ngày Phụ nữ Việt Nam 20/10, tớ muốn gửi lời chúc tốt đẹp nhất đến một người con gái vô cùng đặc biệt. Chúc cậu có một ngày thật ngọt ngào, ngập tràn hoa và những nụ cười.",
            "Mong rằng cậu sẽ luôn giữ được sự dịu dàng, nét tươi tắn và tinh thần yêu đời vốn có. Hy vọng mọi điều tốt đẹp, may mắn và hạnh phúc nhất sẽ luôn mỉm cười với em trên con đường sắp tới.",
            "Cảm ơn cậu vì sự xuất hiện dễ thương này, chúc cậu một ngày 20/10 thật ý nghĩa và trọn vẹn nhé!"
        ],
        // Các từ khóa đặc biệt khi gõ tới sẽ phát sáng + bung cánh hoa + kích hoạt âm thanh bối cảnh
        easterEggKeywords: [
           { word: "đặc biệt", soundType: "chime", effect: "sparkle" },
            { word: "nụ cười", soundType: "chime", effect: "bloom" },
            { word: "dịu dàng", soundType: "chord", effect: "sparkle" },
            { word: "hạnh phúc", soundType: "chime", effect: "bloom" },
            { word: "dễ thương", soundType: "chord", effect: "sparkle" }
        ],
        // Dòng chữ Mực Tàng Hình (cần nhấn giữ để làm ấm giấy mới hiện ra)
        invisibleInkSecret:"🎁 Chúc mừng bạn đã cất công giữ tay làm ấm giấy... và phần thưởng của bạn là: Một tràng pháo tay! Bị lừa rồi nhé, chúc bạn may mắn lần sau 😂"
    },

    // 4. Cấu hình Giai đoạn 4: 6 Bức Ảnh Kỷ Niệm (Đúng đường dẫn assets/images/memory-1..6.jpg)
    memories: [
        {
            id: 1,
            src: "assets/images/memory-1.jpg",
            caption: "Cute phô mai que 😉",
            dateLocation: "Locket • Lên đồ đi lượn",
            backTitle: "Pha nháy mắt đi vào lòng người",
            backStory: "Đội mũ bảo hiểm kín mít chuẩn bị đi lượn phố mà vẫn không quên chọc má nháy mắt thả thính một cái mới chịu!",
            backQuote: "“Nháy mắt sương sương thôi cũng đủ 10 điểm đáng yêu!”",
            audioFreq: 440,
            placeholderPalette: ["#ff9a9e", "#fecfef", "#a18cd1"]
        },
        {
            id: 2,
            src: "assets/images/memory-2.jpg",
            caption: "Cô bạn học sinh gương mẫu 🏫",
            dateLocation: "Lớp học • Áo trắng",
            backTitle: "Biểu cảm dỗi cả thế giới",
            backStory: "Mặc áo trắng đeo thẻ học sinh ngoan hiền thế thôi chứ nhìn cái mặt hơi phụng phịu kia là biết đang đói bụng hoặc buồn ngủ rồi!",
            backQuote: "“Bao giờ mới hết tiết để được đi ăn đây...”",
            audioFreq: 493.88,
            placeholderPalette: ["#84fab0", "#8fd3f4", "#a6c0fe"]
        },
        {
            id: 3,
            src: "assets/images/memory-3.jpg",
            caption: "Chiến thần ẩm thực 🥄",
            dateLocation: "Locket • Góc bếp",
            backTitle: "Cầm thìa là thấy uy tín rồi",
            backStory: "Trùm cuối xuất hiện trong bếp với chiếc thìa trên tay và gương mặt hết sức nghiêm túc. Nhìn là biết tâm hồn ăn uống bất diệt!",
            backQuote: "“Có thực mới vực được đạo, ăn trước tính sau!”",
            audioFreq: 783.99,
            placeholderPalette: ["#cfd9df", "#e2ebf0", "#f093fb"]
        },
        {
            id: 4,
            src: "assets/images/memory-4.jpg",
            caption: "Tóc gió thôi bay 🍃",
            dateLocation: "Locket • Vibe nàng thơ",
            backTitle: "Nghệ thuật tóc lòa xòa",
            backStory: "Tóc tai bay tứ tung che cả mặt nhưng đôi mắt trong veo vẫn cứ nổi bần bật, đúng chuẩn phong cách lộn xộn có tính toán!",
            backQuote: "“Tóc rối một chút mới ra dáng nàng thơ!”",
            audioFreq: 659.25,
            placeholderPalette: ["#ffecd2", "#fcb69f", "#ff9a9e"]
        },
        {
            id: 5,
            src: "assets/images/memory-5.jpg",
            caption: "Định bắt nạt ai đấy 🤏",
            dateLocation: "Locket • Tương tác",
            backTitle: "Bàn tay quyền lực",
            backStory: "Đưa tay lên che camera định véo má hay cốc đầu người xem đây không biết, mặt thì làm bộ ngơ ngác vô tội.",
            backQuote: "“Ngoan thì được thương, lì thì coi chừng nha!”",
            audioFreq: 587.33,
            placeholderPalette: ["#a1c4fd", "#c2e9fb", "#667eea"]
        },
        {
            id: 6,
            src: "assets/images/memory-6.jpg",
           caption: "Góc nghiêng thần thánh ✨",
            dateLocation: "Locket • Cận cảnh",
            backTitle: "Cam thường cũng không làm khó được",
            backStory: "Chụp Locket dí sát sàn sạt vào màn hình mà visual vẫn cứ là nét căng, mắt to tròn long lanh không góc chết.",
            backQuote: "“Chụp đại một tấm mà lại ưng không tưởng!”",
            audioFreq: 523.25,
            placeholderPalette: ["#f6d365", "#fda085", "#fbc2eb"]
        }
    ],

    // 5. Cấu hình Giai đoạn 5: Thiệp Lưu Niệm & Mật mã AR
    keepsake: {
        summaryQuote: "“Cảm ơn vì đã xuất hiện như một ánh sao dịu dàng, làm rực rỡ cả bầu trời ký ức. Chúc mừng ngày 20/10!”",
        arGiftRiddle: "🎁 Mật mã Phygital: Sau khi ngắm đóa hoa ánh sáng AR này, hãy mở ngăn kéo bàn làm việc (hoặc kiểm tra hộp quà nhỏ màu kem) để nhận món quà 20/10 ngoài đời thực nhé!"
    }
};