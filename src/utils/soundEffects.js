// 音效工具函数 - 自然的鼓励语音

let sharedAudioContext = null

function getSharedAudioContext() {
  const AudioContextCtor = window.AudioContext || window.webkitAudioContext
  if (!AudioContextCtor) return null

  if (!sharedAudioContext || sharedAudioContext.state === 'closed') {
    sharedAudioContext = new AudioContextCtor()
  }

  if (sharedAudioContext.state === 'suspended') {
    sharedAudioContext.resume().catch(() => {})
  }

  return sharedAudioContext
}

// 鼓励语列表（根据情绪和状态）
const ENCOURAGEMENTS = {
  // 基础鼓励（第一次做对）
  basic: [
    'Good!',
    'Nice!',
    'Great!',
    'Well done!',
    'Awesome!'
  ],
  
  // 连击鼓励（连续做对）
  streak: [
    'Perfect!',
    'Excellent!',
    'Amazing!',
    'Fantastic!',
    'Wonderful!',
    'Outstanding!',
    'Incredible!'
  ],
  
  // 高连击鼓励（5次以上）
  highStreak: [
    'You are on fire!',
    'Unstoppable!',
    'You are amazing!',
    'Keep going!',
    'You are a star!',
    'Perfect streak!'
  ],
  
  // 里程碑鼓励（完成25%、50%、75%）
  milestone: [
    'Great progress!',
    'You are doing great!',
    'Keep it up!',
    'Halfway there!',
    'Almost done!',
    'You are almost there!'
  ],
  
  // 接近完成鼓励（80%以上）
  nearComplete: [
    'Almost there!',
    'Keep it up!',
    'You can do it!',
    'One more!',
    'Come on!',
    'You got this!'
  ],
  
  // 完成单词鼓励
  wordComplete: [
    'Perfect!',
    'Excellent!',
    'Well done!',
    'Great job!',
    'You did it!'
  ]
}

// 判断是否应该播放鼓励语音（科学规则）
function shouldPlayEncouragement(streak, completedWords, totalWords, lastEncouragementInfo) {
  const progress = completedWords / totalWords
  
  // 规则1: 里程碑节点（25%, 50%, 75%, 90%）
  const milestones = [0.25, 0.5, 0.75, 0.9]
  const currentMilestone = milestones.find(m => 
    progress >= m && (!lastEncouragementInfo || lastEncouragementInfo.progress < m)
  )
  if (currentMilestone) {
    return { type: 'milestone', milestone: currentMilestone }
  }
  
  // 规则2: 高连击（5次、10次、15次等）
  if (streak >= 5 && streak % 5 === 0) {
    if (!lastEncouragementInfo || lastEncouragementInfo.streak < streak) {
      return { type: 'highStreak', streak }
    }
  }
  
  // 规则3: 中等连击（3次、6次、9次等）- 但不要太频繁
  if (streak >= 3 && streak % 3 === 0) {
    // 如果距离上次鼓励已经过了至少2个单词
    if (!lastEncouragementInfo || completedWords - lastEncouragementInfo.completedWords >= 2) {
      return { type: 'streak', streak }
    }
  }
  
  // 规则4: 接近完成（80%以上）- 每2个单词鼓励一次
  if (progress >= 0.8 && progress < 1) {
    if (!lastEncouragementInfo || completedWords - lastEncouragementInfo.completedWords >= 2) {
      return { type: 'nearComplete' }
    }
  }
  
  // 规则5: 第一个单词做对（欢迎）
  if (completedWords === 1 && (!lastEncouragementInfo || lastEncouragementInfo.completedWords === 0)) {
    return { type: 'basic' }
  }
  
  // 规则6: 最后一个单词（完成前）
  if (completedWords === totalWords - 1) {
    return { type: 'nearComplete' }
  }
  
  // 默认：不播放鼓励（减少频率）
  return null
}

// 获取鼓励语
function getEncouragementText(encouragementType, streak, progress) {
  switch (encouragementType) {
    case 'highStreak':
      return ENCOURAGEMENTS.highStreak[Math.floor(Math.random() * ENCOURAGEMENTS.highStreak.length)]
    
    case 'streak':
      return ENCOURAGEMENTS.streak[Math.floor(Math.random() * ENCOURAGEMENTS.streak.length)]
    
    case 'milestone':
      if (progress >= 0.9) {
        return ENCOURAGEMENTS.nearComplete[Math.floor(Math.random() * ENCOURAGEMENTS.nearComplete.length)]
      } else if (progress >= 0.75) {
        return 'Almost there!'
      } else if (progress >= 0.5) {
        return 'Halfway there!'
      } else {
        return 'Great progress!'
      }
    
    case 'nearComplete':
      return ENCOURAGEMENTS.nearComplete[Math.floor(Math.random() * ENCOURAGEMENTS.nearComplete.length)]
    
    case 'basic':
    default:
      return ENCOURAGEMENTS.basic[Math.floor(Math.random() * ENCOURAGEMENTS.basic.length)]
  }
}

// 播放单词读音
export function playWordPronunciation(word) {
  try {
    if ('speechSynthesis' in window) {
      // 停止任何正在播放的语音
      speechSynthesis.cancel()
      
      const utterance = new SpeechSynthesisUtterance(word)
      utterance.lang = 'en-US'
      utterance.rate = 0.9 // 稍微慢一点，更清晰
      utterance.pitch = 1.0 // 正常音调
      utterance.volume = 1.0
      
      // 选择清晰的语音
      const voices = speechSynthesis.getVoices()
      const preferredVoices = [
        'Samantha', // macOS 女声
        'Karen',    // macOS 女声
        'Victoria', // macOS 女声
        'Alex',     // macOS 男声
        'Zira',     // Windows 女声
        'Microsoft Zira',
        'Google UK English Female',
        'Google US English Female'
      ]
      
      let selectedVoice = voices.find(voice => 
        preferredVoices.some(name => voice.name.includes(name))
      )
      
      if (!selectedVoice) {
        selectedVoice = voices.find(voice => voice.lang.includes('en-US'))
      }
      
      if (selectedVoice) {
        utterance.voice = selectedVoice
      }
      
      // 延迟一点确保语音列表已加载
      setTimeout(() => {
        speechSynthesis.speak(utterance)
      }, 100)
    }
  } catch (error) {
    console.log('Speech synthesis not available:', error)
  }
}

// 播放自然的鼓励语音（智能触发）
export function playEncouragementSound(streak = 1, completedWords = 0, totalWords = 12, lastEncouragementInfo = null) {
  try {
    // 判断是否应该播放鼓励
    const encouragementInfo = shouldPlayEncouragement(streak, completedWords, totalWords, lastEncouragementInfo)
    
    if (!encouragementInfo) {
      // 不播放鼓励，返回null表示未播放
      return null
    }
    
    if ('speechSynthesis' in window) {
      // 停止任何正在播放的语音
      speechSynthesis.cancel()
      
      const progress = completedWords / totalWords
      const text = getEncouragementText(encouragementInfo.type, streak, progress)
      
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = 'en-US'
      
      // 根据鼓励类型调整语速和音调
      if (encouragementInfo.type === 'highStreak') {
        utterance.rate = 1.1
        utterance.pitch = 1.3
      } else if (encouragementInfo.type === 'streak') {
        utterance.rate = 1.0
        utterance.pitch = 1.2
      } else if (encouragementInfo.type === 'milestone') {
        utterance.rate = 1.0
        utterance.pitch = 1.15
      } else {
        utterance.rate = 0.95
        utterance.pitch = 1.1
      }
      
      utterance.volume = 0.9
      
      // 选择更自然的语音
      const voices = speechSynthesis.getVoices()
      const preferredVoices = [
        'Samantha', // macOS 女声
        'Karen',    // macOS 女声
        'Victoria', // macOS 女声
        'Zira',     // Windows 女声
        'Microsoft Zira',
        'Google UK English Female',
        'Google US English Female'
      ]
      
      let selectedVoice = voices.find(voice => 
        preferredVoices.some(name => voice.name.includes(name))
      )
      
      if (!selectedVoice) {
        selectedVoice = voices.find(voice => 
          voice.lang.includes('en') && 
          (voice.name.toLowerCase().includes('female') || 
           voice.name.toLowerCase().includes('woman') ||
           voice.gender === 'female')
        )
      }
      
      if (!selectedVoice) {
        selectedVoice = voices.find(voice => voice.lang.includes('en-US'))
      }
      
      if (selectedVoice) {
        utterance.voice = selectedVoice
      }
      
      // 延迟一点确保语音列表已加载
      setTimeout(() => {
        speechSynthesis.speak(utterance)
      }, 50)
      
      // 返回鼓励信息，用于记录
      return {
        ...encouragementInfo,
        completedWords,
        progress,
        streak
      }
    }
  } catch (error) {
    console.log('Speech synthesis not available:', error)
    return null
  }
  
  return null
}

// 播放成功音效（使用音频上下文生成简单的音调）
export function playSuccessTone(streak = 1) {
  try {
    const audioContext = getSharedAudioContext()
    if (!audioContext) return
    
    // 根据连击数调整音调
    let baseFreq = 523.25 // C5
    let endFreq = 783.99   // G5
    
    if (streak >= 5) {
      // 高连击：更高的音调
      baseFreq = 659.25 // E5
      endFreq = 987.77  // B5
    } else if (streak >= 2) {
      // 连击：中等音调
      baseFreq = 587.33 // D5
      endFreq = 880.00  // A5
    }
    
    // 创建两个音调，形成更丰富的音效
    const oscillator1 = audioContext.createOscillator()
    const oscillator2 = audioContext.createOscillator()
    const gainNode = audioContext.createGain()
    
    oscillator1.type = 'sine'
    oscillator2.type = 'sine'
    
    oscillator1.connect(gainNode)
    oscillator2.connect(gainNode)
    gainNode.connect(audioContext.destination)
    
    // 播放一个上升的音调
    const now = audioContext.currentTime
    oscillator1.frequency.setValueAtTime(baseFreq, now)
    oscillator1.frequency.exponentialRampToValueAtTime(endFreq, now + 0.2)
    
    oscillator2.frequency.setValueAtTime(baseFreq * 1.2, now)
    oscillator2.frequency.exponentialRampToValueAtTime(endFreq * 1.2, now + 0.2)
    
    gainNode.gain.setValueAtTime(0.3, now)
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3)
    
    oscillator1.start(now)
    oscillator2.start(now)
    oscillator1.stop(now + 0.3)
    oscillator2.stop(now + 0.3)
  } catch (error) {
    console.log('Audio context not available:', error)
  }
}

// 初始化语音（某些浏览器需要用户交互后才能使用）
export function initSpeechSynthesis() {
  if ('speechSynthesis' in window) {
    // 加载语音列表
    if (speechSynthesis.getVoices().length === 0) {
      speechSynthesis.addEventListener('voiceschanged', () => {
        // 语音列表已加载
        console.log('语音列表已加载:', speechSynthesis.getVoices().length, '个语音')
      })
    } else {
      console.log('语音列表已就绪:', speechSynthesis.getVoices().length, '个语音')
    }
  }
}

// 兼容旧接口
export function playYesSound() {
  playEncouragementSound(1, 0, 12, null)
}
