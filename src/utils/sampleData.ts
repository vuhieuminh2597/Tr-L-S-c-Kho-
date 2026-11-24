import { AppData, DailyLog, UserProfile } from '../types';
import { getPastDateKeys, getTodayStr } from './dateUtils';

export function createDemoSampleData(
  currentTheme: 'light' | 'dark' = 'light',
  existingProfile?: UserProfile
): AppData {
  const today = getTodayStr();
  const last7 = getPastDateKeys(7, today);

  const sampleTemplates: Omit<DailyLog, 'date' | 'updatedAt'>[] = [
    {
      mood: 6,
      stress: 6,
      emotions: ['Áp lực', 'Cố gắng'],
      focusHours: 3.5,
      sleepHours: 6.0,
      sleepQuality: 3,
      energy: 5,
      waterGlasses: 5,
      exerciseMinutes: 15,
      exerciseType: 'Đi bộ nhẹ',
      physicalNotes: 'Hơi mỏi vai gáy do ngồi máy tính lâu',
      gratitude: 'Bữa tối ấm cúng và yên tĩnh',
      journal: 'Đầu tuần khá nhiều việc dồn lại, ngủ hơi muộn nên chiều thấy hụt hơi nhẹ.',
    },
    {
      mood: 5,
      stress: 7,
      emotions: ['Mệt mỏi', 'Lo âu'],
      focusHours: 3,
      sleepHours: 5.5,
      sleepQuality: 2,
      energy: 4,
      waterGlasses: 5,
      exerciseMinutes: 0,
      physicalNotes: 'Khó vào giấc ngủ, căng mắt',
      gratitude: 'Đồng nghiệp hỗ trợ kịp thời một phần việc khó',
      journal: 'Thức khuya hai hôm liền làm mình dễ cáu và khó tập trung hơn hẳn.',
    },
    {
      mood: 7,
      stress: 5,
      emotions: ['Bình yên', 'Tập trung'],
      focusHours: 4.5,
      sleepHours: 7.5,
      sleepQuality: 4,
      energy: 7,
      waterGlasses: 7,
      exerciseMinutes: 30,
      exerciseType: 'Chạy bộ chậm',
      physicalNotes: 'Cơ thể nhẹ nhõm sau khi ngủ đủ giấc',
      gratitude: 'Ngủ sớm được từ 23h đêm qua',
      journal: 'Chỉ cần ngủ đủ 7.5 tiếng là sáng dậy đầu óc sáng suốt khác hẳn!',
    },
    {
      mood: 8,
      stress: 4,
      emotions: ['Hứng khởi', 'Biết ơn', 'Tập trung'],
      focusHours: 5,
      sleepHours: 7.5,
      sleepQuality: 4,
      energy: 8,
      waterGlasses: 8,
      exerciseMinutes: 35,
      exerciseType: 'Tập giãn cơ & Cardio',
      physicalNotes: 'Năng lượng ổn định cả ngày',
      gratitude: 'Hoàn thành xong một cột mốc quan trọng của mục tiêu cá nhân',
      journal: 'Hôm nay giữ được nhịp làm việc sâu không xao nhãng mạng xã hội.',
    },
    {
      mood: 7,
      stress: 4,
      emotions: ['Bình yên', 'Biết ơn'],
      focusHours: 4,
      sleepHours: 7.0,
      sleepQuality: 4,
      energy: 7,
      waterGlasses: 7,
      exerciseMinutes: 20,
      exerciseType: 'Đi bộ công viên',
      physicalNotes: 'Thoải mái, dễ chịu',
      gratitude: 'Thời tiết mát mẻ, chiều đi bộ rất thư thái',
      journal: 'Giữ nhịp đều đặn, không ép bản thân quá mức giúp tinh thần rất cân bằng.',
    },
    {
      mood: 8,
      stress: 3,
      emotions: ['Vui vẻ', 'Thư thái', 'Biết ơn'],
      focusHours: 3.5,
      sleepHours: 8.0,
      sleepQuality: 5,
      energy: 8,
      waterGlasses: 8,
      exerciseMinutes: 40,
      exerciseType: 'Chạy bộ & Hít thở',
      physicalNotes: 'Khoẻ khoắn, ngủ rất sâu',
      gratitude: 'Dành thời gian đọc sách và trò chuyện với người thân',
      journal: 'Cuối tuần nạp lại năng lượng đúng nghĩa, sẵn sàng cho chặng mục tiêu mới.',
    },
    {
      mood: 8,
      stress: 3,
      emotions: ['Bình yên', 'Hứng khởi', 'Tập trung'],
      focusHours: 4.5,
      sleepHours: 7.5,
      sleepQuality: 4,
      energy: 8,
      waterGlasses: 6,
      exerciseMinutes: 30,
      exerciseType: 'Tập thể dục buổi sáng',
      physicalNotes: 'Tinh thần minh mẫn, tràn đầy động lực',
      gratitude: 'Có không gian riêng để nhìn lại và hiểu bản thân mỗi ngày',
      journal: 'Bắt đầu thấy rõ quy luật: ngủ trước 23h và vận động 30 phút là chìa khoá giữ tâm lý vững vàng.',
    },
  ];

  const dailyLogs: Record<string, DailyLog> = {};
  last7.forEach((dateKey, idx) => {
    const tpl = sampleTemplates[idx] || sampleTemplates[sampleTemplates.length - 1];
    dailyLogs[dateKey] = {
      ...tpl,
      bedtimeSlot: tpl.sleepHours >= 7 ? '2230_2330' : 'after_0030',
      triggers:
        tpl.stress >= 6
          ? ['Công việc / Học tập', 'Màn hình khuya']
          : ['Vận động tốt', 'Ngủ đúng giờ'],
      date: dateKey,
      updatedAt: new Date().toISOString(),
    };
  });

  const activeCompanionName = existingProfile?.companionName?.trim() || 'Tâm An';
  const activeUserName = existingProfile?.userName?.trim() || 'Bạn';

  return {
    version: 2,
    updatedAt: new Date().toISOString(),
    theme: currentTheme,
    profile: existingProfile
      ? { ...existingProfile }
      : {
          userName: activeUserName,
          companionName: activeCompanionName,
          pronounStyle: 'minh_ban',
          bioOrFocus:
            'Xây dựng lối sống cân bằng, nâng cao sức bền thể chất và tập trung phát triển sự nghiệp bền vững.',
          age: 27,
          birthYear: new Date().getFullYear() - 27,
          heightCm: 170,
          weightKg: 64,
          nationality: 'Việt Nam',
          personality:
            'Hướng nội, cầu toàn, thích sự rõ ràng nhưng đôi khi hay suy nghĩ nhiều (overthinking)',
        },
    dailyLogs,
    goals: [
      {
        id: 'goal-1',
        title: 'Thiết lập nhịp sinh học ngủ trước 23:00 và dậy lúc 06:30',
        category: 'health',
        whyItMatters: 'Để có tinh thần minh mẫn, hết mệt mỏi buổi chiều và bảo vệ sức khoẻ lâu dài.',
        progress: 65,
        status: 'active',
        milestones: [
          { id: 'm-1', title: 'Tắt màn hình điện thoại trước 22:30 trong 5 ngày', completed: true },
          { id: 'm-2', title: 'Duy trì trung bình 7.5 giờ ngủ/đêm suốt 2 tuần', completed: true },
          { id: 'm-3', title: 'Đạt chuỗi 21 ngày thức dậy tự nhiên không cần báo thức gấp', completed: false },
        ],
        createdAt: new Date().toISOString(),
      },
      {
        id: 'goal-2',
        title: 'Hoàn thành dự án cá nhân & nâng cao kỹ năng chuyên môn',
        category: 'career',
        whyItMatters: 'Tạo bước đệm vững chắc cho mục tiêu thu nhập và sự tự chủ trong năm nay.',
        progress: 40,
        status: 'active',
        milestones: [
          { id: 'm-4', title: 'Lên khung kế hoạch và phân chia lộ trình 4 tuần', completed: true },
          { id: 'm-5', title: 'Dành 90 phút tập trung sâu (Deep Work) mỗi sáng', completed: false },
          { id: 'm-6', title: 'Hoàn thiện phiên bản đầu tiên và tự đánh giá kết quả', completed: false },
        ],
        createdAt: new Date().toISOString(),
      },
      {
        id: 'goal-3',
        title: 'Thực hành viết nhật ký & giải toả căng thẳng mỗi tối',
        category: 'mind',
        whyItMatters: 'Hiểu rõ quy luật cảm xúc của bản thân, không để áp lực tích tụ âm ỉ.',
        progress: 70,
        status: 'active',
        milestones: [
          { id: 'm-7', title: 'Ghi nhận tâm trạng & 1 điều biết ơn 7 ngày liên tiếp', completed: true },
          { id: 'm-8', title: `Tổng kết quy luật tâm sinh lý cuối mỗi tuần cùng ${activeCompanionName}`, completed: false },
        ],
        createdAt: new Date().toISOString(),
      },
    ],
    habits: [
      {
        id: 'habit-1',
        title: 'Ngủ trước 23:00',
        icon: '🌙',
        category: 'health',
        linkedGoalId: 'goal-1',
        completedDates: last7.slice(2),
        createdAt: new Date().toISOString(),
      },
      {
        id: 'habit-2',
        title: 'Vận động ít nhất 30 phút',
        icon: '🏃',
        category: 'health',
        completedDates: [last7[2], last7[3], last7[5], last7[6]],
        createdAt: new Date().toISOString(),
      },
      {
        id: 'habit-3',
        title: '90 phút Tập trung sâu (Deep Work)',
        icon: '🎯',
        category: 'growth',
        linkedGoalId: 'goal-2',
        completedDates: [last7[0], last7[2], last7[3], last7[4], last7[6]],
        createdAt: new Date().toISOString(),
      },
      {
        id: 'habit-4',
        title: 'Viết nhật ký & 1 điều biết ơn',
        icon: '🌿',
        category: 'mind',
        linkedGoalId: 'goal-3',
        completedDates: [...last7],
        createdAt: new Date().toISOString(),
      },
    ],
    chatThreads: [
      {
        id: 'thread-welcome',
        title: `Cuộc trò chuyện mở đầu cùng ${activeCompanionName}`,
        updatedAt: new Date().toISOString(),
        messages: [
          {
            id: 'msg-welcome',
            role: 'assistant',
            content: `Chào ${activeUserName}! Mình là **${activeCompanionName}** — người bạn đồng hành luôn ở đây để cùng bạn chăm sóc sức khoẻ thể chất, lắng nghe những chuyển động tâm lý mỗi ngày và giữ nhịp cho các mục tiêu bạn đang hướng tới.\n\nHôm nay cơ thể và tâm trí của bạn đang cảm thấy thế nào? Bạn có thể chia sẻ bất cứ điều gì, hoặc nhờ mình phân tích dữ liệu những ngày qua nhé!`,
            createdAt: new Date().toISOString(),
          },
        ],
      },
    ],
    insightReports: [],
  };
}

export function createLongTermDemoData(
  totalDays = 180,
  currentTheme: 'light' | 'dark' = 'light',
  existingProfile?: UserProfile
): AppData {
  const base = createDemoSampleData(currentTheme, existingProfile);
  const today = getTodayStr();
  const allDates = getPastDateKeys(totalDays, today);
  const dailyLogs: Record<string, DailyLog> = {};

  const positiveEmotions = ['Bình yên', 'Tập trung', 'Biết ơn', 'Hứng khởi', 'Thư thái', 'Tự tin'];
  const tiredEmotions = ['Mệt mỏi', 'Áp lực', 'Lo âu', 'Xao nhãng', 'Cố gắng'];
  const workouts = ['Đi bộ nhanh', 'Chạy bộ chậm', 'Giãn cơ & Yoga', 'Đạp xe', 'Tập thể lực tại nhà'];

  allDates.forEach((dateKey, idx) => {
    // Tạo xu hướng tiến bộ dần qua nhiều tháng kết hợp chu kỳ tuần tự nhiên
    const progressFactor = idx / Math.max(1, totalDays - 1); // 0 -> 1
    const wave = Math.sin(idx / 5.5) * 1.1 + Math.cos(idx / 13) * 0.7;
    const isWeekend = [0, 6].includes(new Date(dateKey).getDay());

    const rawSleep = 6.3 + progressFactor * 1.1 + (isWeekend ? 0.6 : 0) + wave * 0.45;
    const sleepHours = Math.max(4.5, Math.min(9.5, Math.round(rawSleep * 2) / 2));
    const sleepQuality = Math.max(1, Math.min(5, Math.round((sleepHours - 3.5) * 0.85)));

    const exerciseMinutes =
      idx % 3 === 0
        ? 0
        : Math.max(15, Math.min(60, Math.round((20 + progressFactor * 20 + wave * 6) / 5) * 5));

    const energy = Math.max(
      2,
      Math.min(
        10,
        Math.round(4.2 + (sleepHours - 5.5) * 1.15 + (exerciseMinutes > 0 ? 0.8 : 0) + progressFactor * 0.8)
      )
    );

    const stress = Math.max(
      1,
      Math.min(
        10,
        Math.round(7.2 - (sleepHours - 5.5) * 0.85 - (isWeekend ? 1.2 : 0) - progressFactor * 1.1 - (exerciseMinutes >= 25 ? 0.6 : 0))
      )
    );

    const mood = Math.max(
      2,
      Math.min(
        10,
        Math.round(5.2 + (sleepHours - 5.5) * 0.9 + (exerciseMinutes >= 20 ? 0.7 : 0) - (stress - 5) * 0.45 + progressFactor * 1.2)
      )
    );

    const waterGlasses = Math.max(4, Math.min(10, Math.round(5.5 + progressFactor * 2.2 + (exerciseMinutes > 20 ? 1 : 0))));
    const focusHours = Math.max(1, Math.min(8, Math.round((3.2 + (energy - 5) * 0.55) * 2) / 2));

    const emotions =
      mood >= 7
        ? [
            positiveEmotions[idx % positiveEmotions.length],
            positiveEmotions[(idx + 2) % positiveEmotions.length],
          ]
        : [
            tiredEmotions[idx % tiredEmotions.length],
            ...(sleepHours >= 7 ? ['Cố gắng'] : ['Mệt mỏi']),
          ];

    dailyLogs[dateKey] = {
      date: dateKey,
      mood,
      stress,
      emotions,
      triggers:
        sleepHours < 6
          ? ['Công việc / Học tập', 'Màn hình khuya']
          : exerciseMinutes >= 25
          ? ['Vận động tốt', 'Làm việc hiệu quả']
          : ['Nhịp sống đều đặn'],
      focusHours,
      sleepHours,
      sleepQuality,
      bedtimeSlot:
        sleepHours >= 7.5 ? 'before_2230' : sleepHours >= 6.5 ? '2230_2330' : 'after_0030',
      energy,
      waterGlasses,
      exerciseMinutes,
      exerciseType: exerciseMinutes > 0 ? workouts[idx % workouts.length] : '',
      weightKg: Number((64.5 - progressFactor * 1.8).toFixed(1)),
      physicalNotes:
        sleepHours < 6
          ? 'Ngủ ít nên chiều hơi mỏi mắt và uể oải'
          : 'Cơ thể nhẹ nhàng, nhịp sinh học ổn định',
      gratitude:
        idx % 2 === 0
          ? 'Giữ được sự kiên trì với mục tiêu dài hạn của bản thân'
          : 'Một bữa ăn lành mạnh và giấc ngủ sâu',
      journal:
        mood >= 7
          ? `Ngày thứ ${idx + 1} trong chuỗi theo dõi: Ngủ ${sleepHours}h giúp đầu óc minh mẫn và tập trung hiệu quả.`
          : `Hôm nay khối lượng việc hơi dày (ngủ ${sleepHours}h), tự nhắc bản thân đi ngủ sớm hơn tối nay để hồi phục.`,
      updatedAt: new Date().toISOString(),
    };
  });

  // Cập nhật lịch sử hoàn thành thói quen trải dài theo 180 ngày
  const habits = base.habits.map((h, hIdx) => ({
    ...h,
    completedDates: allDates.filter((_, dIdx) => (dIdx + hIdx) % 3 !== 0 || dIdx > totalDays - 10),
  }));

  return {
    ...base,
    dailyLogs,
    habits,
  };
}

export function createInitialCleanData(existingProfile?: UserProfile): AppData {
  const activeCompanionName = existingProfile?.companionName?.trim() || 'Tâm An';
  return {
    version: 2,
    updatedAt: new Date().toISOString(),
    theme: 'light',
    profile: existingProfile
      ? { ...existingProfile }
      : {
          userName: 'Bạn',
          companionName: activeCompanionName,
          pronounStyle: 'minh_ban',
          bioOrFocus: '',
          heightCm: 170,
          weightKg: 62,
          nationality: 'Việt Nam',
          personality: '',
        },
    dailyLogs: {},
    goals: [],
    habits: [
      {
        id: 'habit-default-1',
        title: 'Uống đủ 8 cốc nước',
        icon: '💧',
        category: 'health',
        completedDates: [],
        createdAt: new Date().toISOString(),
      },
      {
        id: 'habit-default-2',
        title: 'Vận động cơ thể 30 phút',
        icon: '🏃',
        category: 'health',
        completedDates: [],
        createdAt: new Date().toISOString(),
      },
      {
        id: 'habit-default-3',
        title: 'Dành 5 phút lắng lại & ghi nhận cảm xúc',
        icon: '🌿',
        category: 'mind',
        completedDates: [],
        createdAt: new Date().toISOString(),
      },
    ],
    chatThreads: [
      {
        id: 'thread-welcome',
        title: `Trò chuyện cùng ${activeCompanionName}`,
        updatedAt: new Date().toISOString(),
        messages: [
          {
            id: 'msg-welcome',
            role: 'assistant',
            content: `Xin chào! Mình là **${activeCompanionName}** — trợ lý sức khoẻ, người lắng nghe tâm lý và cũng là người bạn đồng hành trên hành trình chinh phục mục tiêu của bạn.\n\nĐể bắt đầu sử dụng trí tuệ nhân tạo miễn phí, bạn chỉ cần ghé mục **Cài đặt** để dán API Key (ví dụ Google Gemini hoặc Groq), hoặc bắt đầu ghi lại **Nhật ký Tâm - Sinh - Lý** ngày hôm nay ngay nhé!`,
            createdAt: new Date().toISOString(),
          },
        ],
      },
    ],
    insightReports: [],
  };
}
