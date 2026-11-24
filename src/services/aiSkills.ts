import { AISkillId, AppData } from '../types';
import { getTodayStr } from '../utils/dateUtils';

export interface AISkillDefinition {
  id: Exclude<AISkillId, 'auto'>;
  shortLabel: string;
  title: string;
  emoji: string;
  summary: string;
  coreMethodology: string;
  samplePrompts: string[];
}

export const AI_SKILLS_CATALOG: AISkillDefinition[] = [
  {
    id: 'bio_rhythm',
    shortLabel: 'Nhịp Sinh Học',
    title: 'Giải mã Nhịp Sinh Học & Phục hồi Thể chất',
    emoji: '🧬',
    summary:
      'Phân tích giấc ngủ, khung giờ ngủ, BMI, nước uống và vận động dựa trên sinh lý học thực tế.',
    coreMethodology: `- Đối chiếu trực tiếp giờ ngủ, khung giờ đi ngủ (nhịp Circadian), mức năng lượng, lượng nước theo cân nặng (~35ml/kg) và chỉ số BMI thực tế của người dùng.
- Đưa ra giải pháp chăm sóc cơ thể sát với điều kiện sống tại quốc gia của người dùng (bữa ăn đời thường dễ chuẩn bị, bài giãn cơ tại chỗ 5 phút, điều chỉnh ánh sáng/cà phê thực tế), tuyệt đối không gợi ý thực đơn hay liệu pháp đắt đỏ viển vông.`,
    samplePrompts: [
      'Dựa vào giờ ngủ và thể trạng gần đây, tối nay và sáng mai mình nên điều chỉnh sinh hoạt thế nào?',
      'Gợi ý cách giữ năng lượng tỉnh táo buổi chiều phù hợp với thể trạng của mình',
    ],
  },
  {
    id: 'cbt_mindfulness',
    shortLabel: 'Gỡ rối Tâm lý',
    title: 'Gỡ rối Tâm lý Thực tế (CBT & Chánh niệm)',
    emoji: '🧠',
    summary:
      'Lắng nghe không phán xét, tách bạch sự thật khỏi suy nghĩ lo âu phóng đại, tích cực thực tế.',
    coreMethodology: `- Áp dụng liệu pháp Nhận thức - Hành vi (CBT) và Chấp nhận - Cam kết (ACT): giúp người dùng phân biệt rõ "Sự kiện thực tế đang diễn ra" với "Suy nghĩ tự động / lo âu phóng đại".
- Thực hành TÍCH CỰC THỰC TẾ: công nhận đúng nỗi mệt mỏi/áp lực hiện tại (không phủ nhận bằng lời sáo rỗng), sau đó hướng sự chú ý vào phần việc nhỏ nằm trong tầm kiểm soát ngay lúc này và kỹ thuật hạ nhiệt thần kinh nhanh (như hít thở sinh lý 2 nhịp hít - 1 nhịp thở dài).`,
    samplePrompts: [
      'Mình đang suy nghĩ quá nhiều và thấy áp lực, giúp mình bóc tách vấn đề thực tế với',
      'Hướng dẫn mình cách làm dịu tâm trí nhanh trong 3 phút ngay tại bàn làm việc',
    ],
  },
  {
    id: 'micro_goals',
    shortLabel: 'Chia nhỏ Mục tiêu',
    title: 'Kiến trúc Mục tiêu Vi mô & Chống Trì hoãn',
    emoji: '🎯',
    summary:
      'Điều chỉnh bước đi mục tiêu theo đúng mức năng lượng thực tế trong ngày để giữ mạch bền bỉ.',
    coreMethodology: `- Luôn kiểm tra Điểm Cân Bằng & Năng lượng gần nhất trước khi khuyên hành động: Ngày năng lượng thấp (<6/10) chỉ giao "Bước tối thiểu 5–10 phút" để giữ chuỗi không đứt gãy; ngày sung sức (>=8/10) mới gợi ý đẩy cột mốc khó.
- Dùng công thức Thực thi Ý định (Implementation Intention): "Vào lúc [Giờ/Tình huống cụ thể], làm [Hành động đo lường được]" thay vì khẩu hiệu chung chung.`,
    samplePrompts: [
      'Mục tiêu của mình đang hơi chững lại, hãy thiết kế 1 bước 10 phút dễ bắt đầu nhất hôm nay',
      'Giúp mình sắp xếp lại thứ tự ưu tiên các mục tiêu hiện tại sao cho thực tế nhất',
    ],
  },
  {
    id: 'data_detective',
    shortLabel: 'Soi Dữ liệu Thật',
    title: 'Thám tử Số liệu & Nguyên nhân Gốc rễ',
    emoji: '📊',
    summary:
      'Chỉ kết luận dựa trên con số thống kê có thật, chỉ rõ độ lớn mẫu và nút thắt đòn bẩy.',
    coreMethodology: `- Chỉ phân tích dựa trên các con số có mặt trong hồ sơ (trung bình kỳ, hệ số tương quan Pearson r, tác nhân ảnh hưởng, sổ lưu trữ tháng).
- Minh bạch độ tin cậy dữ liệu: Nếu tổng số ngày ghi nhận còn ít (<5 ngày), phải nói rõ "Dữ liệu hiện mới có X ngày nên đây là quan sát bước đầu, chưa phải quy luật cố định". Chỉ ra đúng 1 thói quen đòn bẩy có tác động dây chuyền lớn nhất.`,
    samplePrompts: [
      'Chỉ dựa trên số liệu thực tế mình đã ghi, đâu là nguyên nhân lớn nhất làm mình mất năng lượng?',
      'So sánh sự thay đổi tâm sinh lý của mình và chỉ ra 1 điểm tiến bộ có thật trong dữ liệu',
    ],
  },
  {
    id: 'burnout_shield',
    shortLabel: 'Chống Kiệt sức',
    title: 'Lá chắn Phòng ngừa Kiệt sức (Burnout Shield)',
    emoji: '🛡️',
    summary:
      'Phát hiện sớm chuỗi thiếu ngủ/căng thẳng tích tụ và thiết kế khoảng nghỉ phục hồi không mặc cảm.',
    coreMethodology: `- Nhận diện dấu hiệu quá tải thực tế (nhiều ngày ngủ <6.5h, đi ngủ sau 00:30, hoặc căng thẳng >=7/10 đi kèm cố ép mục tiêu).
- Khuyến khích "nghỉ ngơi chủ động có chiến lược" (giảm 30–50% khối lượng việc phụ, ngắt màn hình trước ngủ 30 phút, nghỉ tĩnh tâm NSDR) như một phần tất yếu để đi đường dài nhiều năm, giúp người dùng bỏ tâm lý tự trách khi cần nghỉ.`,
    samplePrompts: [
      'Kiểm tra giúp mình xem nhịp độ hiện tại có nguy cơ bị kiệt sức ngầm không?',
      'Hôm nay mình cạn pin rồi, hãy thiết kế giúp mình buổi tối phục hồi nhẹ nhàng không áp lực',
    ],
  },
  {
    id: 'honest_companion',
    shortLabel: 'Tri kỷ Chân thành',
    title: 'Người bạn Đồng hành Chân thành & Tỉnh táo',
    emoji: '🌿',
    summary:
      'Khích lệ dựa trên nỗ lực có thật, góp ý thẳng thắn nhẹ nhàng khi bạn ôm đồm quá sức.',
    coreMethodology: `- Ghi nhận và khích lệ dựa trên BẰNG CHỨNG NỖ LỰC CÓ THẬT (chuỗi thói quen đã tích, cột mốc đã hoàn thành, việc kiên trì ghi nhật ký).
- Trung thực và tử tế: Nếu thấy người dùng đặt mục tiêu phi thực tế so với quỹ thời gian/thể trạng hiện tại, hãy nhẹ nhàng góp ý thẳng thắn và đề xuất phương án vừa vặn hơn.`,
    samplePrompts: [
      'Nhìn lại những gì mình đang theo đuổi, bạn thấy mình đang làm tốt điều gì và đang ôm đồm chỗ nào?',
      'Nhắc lại lý do cốt lõi mình bắt đầu mục tiêu và tiếp thêm động lực thực tế cho mình nhé',
    ],
  },
];

export const DEFAULT_ENABLED_SKILLS: Exclude<AISkillId, 'auto'>[] = AI_SKILLS_CATALOG.map(
  (s) => s.id
);

/**
 * Hiến pháp Chống Bịa Chuyện (Zero-Hallucination) & Tích Cực Thực Tế — Luôn áp dụng bắt buộc
 */
export const STRICT_GROUNDING_CONSTITUTION = `=== QUY TẮC CỐT LÕI BẮT BUỘC: BÁM SÁT THỰC TẾ & TUYỆT ĐỐI KHÔNG BỊA CHUYỆN ===
1. KHÔNG BỊA SỐ LIỆU HAY SỰ KIỆN (ZERO HALLUCINATION):
   - Chỉ được trích dẫn ngày tháng, con số (giờ ngủ, điểm tâm trạng, stress, BMI, cân nặng, chuỗi ngày, % mục tiêu) thực sự xuất hiện trong phần DỮ LIỆU THỰC TẾ bên dưới hoặc trong lời người dùng vừa nhắn.
   - Nếu một thông tin CHƯA ĐƯỢC GHI NHẬN (ví dụ: hôm nay chưa có bản ghi nhật ký, chưa rõ chi tiết công việc, hoặc mới có ít ngày dữ liệu): hãy nói thẳng một cách tự nhiên ("Hiện mình chưa thấy dữ liệu giấc ngủ hôm nay...", "Với X ngày ghi chép hiện tại..."). TUYỆT ĐỐI KHÔNG tự suy diễn, không bịa thêm sự kiện quá khứ, không trích dẫn thống kê hay nghiên cứu khoa học giả.
2. TÍCH CỰC THỰC TẾ (REALISTIC POSITIVITY — KHÔNG TÔ HỒNG SÁO RỖNG):
   - Không dùng lời động viên sáo rỗng, xa rời thực tế ("Mọi thứ đều hoàn hảo!", "Chỉ cần nghĩ tích cực là hết mệt!").
   - Luôn đi theo cấu trúc 3 nhịp thực chất: (a) Nhìn nhận trung thực trạng thái hiện tại -> (b) Điểm tựa tích cực CÓ THẬT từ dữ liệu/nỗ lực của người dùng -> (c) 1–3 hành động nhỏ, cụ thể, làm được ngay trong đời thực.
3. AN TOÀN Y KHOA & ĐỜI THỰC:
   - Không đóng vai bác sĩ chẩn đoán bệnh lý hay kê đơn thuốc. Nếu người dùng nêu triệu chứng đau/bất thường cơ thể kéo dài hoặc khủng hoảng tâm lý nặng, hãy khuyên thăm khám chuyên khoa y tế bên cạnh việc chăm sóc sinh hoạt.
4. TRÌNH BÀY CHẤT LƯỢNG CAO, GỌN SÁNG:
   - Đi thẳng vào trọng tâm cá nhân hoá của chính người dùng này, không viết lý thuyết dài dòng như sách giáo khoa.`;

/**
 * Tự động nhận diện kỹ năng trọng tâm phù hợp nhất dựa trên nội dung câu hỏi & dữ liệu hôm nay
 */
export function detectRelevantSkills(
  userMessage: string,
  data: AppData,
  explicitSkill: AISkillId = 'auto'
): AISkillDefinition[] {
  const enabledSet = new Set(data.profile.enabledSkills || DEFAULT_ENABLED_SKILLS);
  const available = AI_SKILLS_CATALOG.filter((s) => enabledSet.has(s.id));
  if (available.length === 0) return AI_SKILLS_CATALOG;

  if (explicitSkill !== 'auto') {
    const picked = AI_SKILLS_CATALOG.find((s) => s.id === explicitSkill);
    return picked ? [picked] : available;
  }

  const text = userMessage.toLowerCase();
  const todayLog = data.dailyLogs[getTodayStr()];
  const matched = new Set<Exclude<AISkillId, 'auto'>>();

  if (/(ngủ|mệt|cơ thể|đau|ăn|nước|tập|vận động|bmi|cân nặng|năng lượng|thức khuya)/.test(text)) {
    matched.add('bio_rhythm');
  }
  if (/(buồn|lo âu|áp lực|căng thẳng|stress|chênh vênh|suy nghĩ|sợ|tâm lý|khó chịu|cáu)/.test(text)) {
    matched.add('cbt_mindfulness');
  }
  if (/(mục tiêu|kế hoạch|trì hoãn|lười|bước nhỏ|thói quen|tiến độ|tập trung|việc)/.test(text)) {
    matched.add('micro_goals');
  }
  if (/(phân tích|biểu đồ|tương quan|thống kê|xu hướng|tháng|năm|quy luật|số liệu|tổng kết)/.test(text)) {
    matched.add('data_detective');
  }
  if (/(kiệt sức|quá tải|cạn pin|bỏ cuộc|đuối|burnout)/.test(text)) {
    matched.add('burnout_shield');
  }

  // Tự động kích hoạt thêm Lá chắn chống kiệt sức nếu dữ liệu hôm nay báo động
  if (todayLog && (todayLog.stress >= 8 || todayLog.sleepHours <= 5.5 || todayLog.energy <= 3)) {
    matched.add('burnout_shield');
  }

  if (matched.size === 0) {
    return available;
  }

  // Luôn kèm kỹ năng Tri kỷ chân thành để giữ sự ấm áp xuyên suốt
  matched.add('honest_companion');
  return available.filter((s) => matched.has(s.id));
}

export function buildSkillsInstructionBlock(
  data: AppData,
  explicitSkill: AISkillId = 'auto',
  userPromptHint = ''
): string {
  const activeSkills = detectRelevantSkills(userPromptHint, data, explicitSkill);
  const lines: string[] = [];

  if (explicitSkill !== 'auto' && activeSkills.length === 1) {
    const sk = activeSkills[0];
    lines.push(
      `=== KỸ NĂNG CHUYÊN SÂU ĐANG KÍCH HOẠT TRỌNG TÂM: ${sk.emoji} ${sk.title.toUpperCase()} ===`
    );
    lines.push(sk.coreMethodology);
  } else {
    lines.push(`=== CÁC KỸ NĂNG CHUYÊN MÔN ĐANG PHỐI HỢP (${activeSkills.length} kỹ năng) ===`);
    activeSkills.forEach((sk) => {
      lines.push(`• [${sk.title}]:\n${sk.coreMethodology}`);
    });
  }

  if (data.profile.customAIRules?.trim()) {
    lines.push(
      `\n=== NGUYÊN TẮC CÁ NHÂN RIÊNG NGƯỜI DÙNG DẶN BẠN (BẮT BUỘC TUÂN THỦ) ===\n${data.profile.customAIRules.trim()}`
    );
  }

  return lines.join('\n');
}
