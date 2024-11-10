interface MetaItem {
  t: number;
  c: { tx: string }[];
}
function paseMetaData(lyric:string){
  // 正则匹配元数据 {"t": 0, "c": [...]}
  const metaReg = /{.*?"t":\s*(\d+).*?"c":\s*(\[\{.*?\}\])/g;
  // 解析元数据
  const metadata: MetaItem[] = [];
  let metaMatch;
  while ((metaMatch = metaReg.exec(lyric)) !== null) {
    const time = Number(metaMatch[1]); // 提取时间戳
    const contentJson = metaMatch[2]; // 提取元数据内容

    try {
      // 解析元数据 JSON
      const metaItem = {
        t: time,
        c: JSON.parse(contentJson)
      };
      metadata.push(metaItem);
    } catch (error) {
      console.error('Error parsing meta data:', error);
    }
  }
  return metadata
}
export function parseLyric(lrc:string,yrcLyric?:string): LyricItem[] {
  const lyrics = lrc.split('\n');
  let lrcObj:LyricItem[] = [];
  let yrcLyricResult: string | any[] = [];
  if(yrcLyric){
     yrcLyricResult =  parseLyricWithWords(yrcLyric); 
  }
  const metadata = paseMetaData(lrc);
  for (let i = 0; i < lyrics.length; i++) {
    const lyric = decodeURIComponent(lyrics[i]);
    const timeReg = /\[\d*:\d*((\.|:)\d*)*\]/g;
    const timeRegExpArr = lyric.match(timeReg);
;
    
    if (!timeRegExpArr) continue;
    const content = lyric.replace(timeReg, '');
    for (let k = 0, h = timeRegExpArr.length; k < h; k++) {
      const t = timeRegExpArr[k];
      
      const min = Number(String(t.match(/\[\d*/i)).slice(1));
      let sec:number;
      const secondMatch =  t.match(/:(\d{2}\.\d*)/);
      if(secondMatch){
        sec = +secondMatch[1];
      }else{
        sec = 0;
      }
      const newTime = Math.round(min * 60 * 1000 + sec * 1000);
      if (content !== '') {
        lrcObj.push({ time: newTime, content, });
      }
    }
  }

  if(yrcLyricResult.length){
    lrcObj = lrcObj.map((item,index) =>{
      return {
        ...item,
        ...yrcLyricResult[index]
      };
    })
  }
 let metaResult =  metadata.map(item => {
    const { t, c } = item;
    let content:string='';
    c.forEach(item =>{
       content += item.tx
    });
    return {
      time:t,
      content,
      translateContent:content
    }
  });

  
  return [...metaResult,...lrcObj];
}
export function parseRangeLyric(lyricList:LyricItem[]) {
  const map = new Map<number, RangeLyricItem>();
  let currentIndex = 0;
  let nextIndex = 1;
  // 如果第一项播放时间不为0，则手动插入一个
  if (lyricList[currentIndex].time !== 0 && lyricList[currentIndex].content !== '纯音乐，请欣赏') {
    lyricList.unshift({
      ...lyricList[currentIndex],
      time: 0
    });
  }
  while (currentIndex !== lyricList.length - 1) {
    const cur = lyricList[currentIndex];
    const next = lyricList[nextIndex];
    for (let start = cur.time; start < next.time; start++) {
      map.set(start, {
        ...cur,
        index: currentIndex
      });
    }
    if (next) {
      currentIndex++;
      nextIndex++;
    }
    if (currentIndex === lyricList.length - 1) {
      map.set(next.time, {
        ...next,
        index: currentIndex
      });
    }
  }
  return map;
}
export interface LyricItem {
  time:number;
  content:string;
  translateContent?:string;
  // newTime:number;
  lineStartTime?: number, lineDuration?: number, words?: WordData[]
}
export interface RangeLyricItem extends LyricItem{
  index:number;
}

interface WordData {
  content: string;
  startTime: number;
  duration: number;
}

export function parseLyricWithWords(input: string): { lineStartTime: number, lineDuration: number, words: WordData[] }[] {
  const result: { lineStartTime: number, lineDuration: number, words: WordData[] }[] = [];

  // 正则表达式匹配歌词行的时间范围 [start, duration]
  const lineRegex = /\[(\d+),(\d+)\]/g;
  
  // 正则表达式匹配逐字的时间信息 (startTime, duration, 0) + 字符
  const wordTimeRegex = /\((\d+),(\d+),\d+\)(\S)/g;

  let lineMatch;
  let lastIndex = 0;

  // 使用 lineRegex 匹配每一行的开始和持续时间
  while ((lineMatch = lineRegex.exec(input)) !== null) {
    // 解析每一行的起始时间和持续时间
    const lineStartTime = parseInt(lineMatch[1]);
    const lineDuration = parseInt(lineMatch[2]);

    // 提取这一行的所有字
    const words: WordData[] = [];
    let wordMatch;
    // 使用 wordTimeRegex 提取逐字的时间和字
    while ((wordMatch = wordTimeRegex.exec(input.slice(lineRegex.lastIndex))) !== null) {
      const wordStartTime = parseInt(wordMatch[1]);
      const wordDuration = parseInt(wordMatch[2]);
      const wordContent = wordMatch[3];

      // 确保每个单字属于当前行
      if (wordStartTime >= lineStartTime && wordStartTime < (lineStartTime + lineDuration)) {
        words.push({ content: wordContent, startTime: wordStartTime, duration: wordDuration });
      }
    }

    // 将解析到的行信息存储到结果中
    result.push({
      lineStartTime,
      lineDuration,
      words
    });

    // 更新 lineRegex 的 lastIndex，用于匹配下一个行
    lastIndex = lineRegex.lastIndex;
  }

  return result;
}
