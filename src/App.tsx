import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowLeft,
  Delete,
  Eraser,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  ArrowRightCircle,
} from 'lucide-react';

type Mode = 'random' | 'all' | 'free';

interface Question {
  title: string;
  hint: string;
  content: string;
}

interface CompletionCount {
  random: number;
  all: number;
  free: number;
}

// 这里配置可用的预设题库文件
const PREDEFINED_QUIZ_FILES: Record<string, string> = {
  '高二上期末语文考试范围.txt': '高二上期末语文考试范围',
};

function App() {
  const [originalText, setOriginalText] = useState('');
  const [maskedText, setMaskedText] = useState<(string | null)[]>([]);
  const [mode, setMode] = useState<Mode>('random');

  const [currentIndex, setCurrentIndex] = useState(-1);
  const [userInput, setUserInput] = useState('');
  const [validatedInput, setValidatedInput] = useState('');
  const [options, setOptions] = useState<string[]>([]);
  const [currentSentenceStart, setCurrentSentenceStart] = useState(0);
  const [initialMask, setInitialMask] = useState<(string | null)[]>([]);

  const [showModal, setShowModal] = useState(false);
  const [questionBankText, setQuestionBankText] = useState('');

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  const [selectedPredefinedFile, setSelectedPredefinedFile] = useState('');

  const [showQuestionSelectModal, setShowQuestionSelectModal] = useState(false);

  const [completions, setCompletions] = useState<CompletionCount[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);

  // -------------------- 从 localStorage 加载 --------------------
  useEffect(() => {
    const savedQuestions = localStorage.getItem('questionBank');
    const savedText = localStorage.getItem('questionBankText');
    const savedCompletions = localStorage.getItem('completions');

    if (savedQuestions) {
      try {
        const parsed = JSON.parse(savedQuestions) as Question[];
        setQuestions(parsed);
      } catch (e) {
        console.error('题库解析失败:', e);
      }
    }
    if (savedText) {
      setQuestionBankText(savedText);
    }
    if (savedCompletions) {
      try {
        setCompletions(JSON.parse(savedCompletions) as CompletionCount[]);
      } catch (e) {
        console.error('完成次数解析失败:', e);
      }
    }
  }, []);

  // 第一次加载题库后，如果 originalText 为空，则显示第 0 题
  useEffect(() => {
    if (questions.length > 0 && originalText.trim() === '') {
      ensureCompletionArrayLength(questions.length);
      setCurrentQuestionIndex(0);
      setTextByQuestion(questions, 0);
    }
  }, [questions]);

  // 补足 completions 数组长度
  const ensureCompletionArrayLength = (lengthNeeded: number) => {
    setCompletions((prev) => {
      const newArr = [...prev];
      while (newArr.length < lengthNeeded) {
        newArr.push({ random: 0, all: 0, free: 0 });
      }
      return newArr;
    });
  };

  // -------------------- 解析并保存题库 --------------------
  const parseQuestionBank = (text: string): Question[] => {
    const rawQuestions = text
      .split(/\n\s*\n/)
      .map(q => q.trim())
      .filter(Boolean);

    const result: Question[] = [];

    for (const block of rawQuestions) {
      let title = '未命名题目';
      let hint = '';
      let content = '';
      const match = block.match(/^【([^]+?)】【([^]+?)】(.*)$/s);
      if (match) {
        title = match[1].trim();
        hint = match[2].trim();
        content = match[3].trim();
      } else {
        content = block;
      }
      result.push({ title, hint, content });
    }
    return result;
  };

  const handleSaveQuestionBank = () => {
    const parsed = parseQuestionBank(questionBankText);
    setQuestions(parsed);
    localStorage.setItem('questionBank', JSON.stringify(parsed));
    localStorage.setItem('questionBankText', questionBankText);
    setShowModal(false);

    ensureCompletionArrayLength(parsed.length);

    if (parsed.length > 0) {
      setCurrentQuestionIndex(0);
      setTextByQuestion(parsed, 0);
    } else {
      setOriginalText('');
      setMaskedText([]);
    }
  };

  // -------------------- 预设题库加载 --------------------
  const loadPredefinedFile = async (fileName: string) => {
    try {
      const response = await fetch(`/predefined/${fileName}`);
      if (!response.ok) {
        throw new Error(`读取预设题库失败: ${fileName}`);
      }
      const textContent = await response.text();
      setQuestionBankText(textContent);
    } catch (err) {
      console.error(err);
      alert(`无法读取预设题库：${fileName}`);
    }
  };

  const handlePredefinedFileChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const fileName = e.target.value;
    setSelectedPredefinedFile(fileName);
    if (fileName) {
      loadPredefinedFile(fileName);
    }
  };

  const handleOpenModal = () => {
    const savedText = localStorage.getItem('questionBankText');
    setQuestionBankText(savedText || '');
    setSelectedPredefinedFile('');
    setShowModal(true);
  };

  // -------------------- 切换题目 --------------------
  const setTextByQuestion = (qs: Question[], index: number) => {
    if (index < 0 || index >= qs.length) return;
    const q = qs[index];
    setOriginalText(q.content);
    const newMasked = createMaskedText(q.content, mode);
    setMaskedText(newMasked);
    setCurrentIndex(-1);
    setOptions([]);
    setCurrentSentenceStart(0);
    setUserInput('');
    setValidatedInput('');
  };

  const handlePrevQuestion = () => {
    if (currentQuestionIndex > 0) {
      const newIndex = currentQuestionIndex - 1;
      setCurrentQuestionIndex(newIndex);
      setTextByQuestion(questions, newIndex);
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      const newIndex = currentQuestionIndex + 1;
      setCurrentQuestionIndex(newIndex);
      setTextByQuestion(questions, newIndex);
    }
  };

  // 题目选择弹窗
  const handleOpenQuestionSelect = () => {
    setShowQuestionSelectModal(true);
  };
  const handleCloseQuestionSelect = () => {
    setShowQuestionSelectModal(false);
  };
  const handleQuestionSelect = (index: number) => {
    setCurrentQuestionIndex(index);
    setTextByQuestion(questions, index);
    setShowQuestionSelectModal(false);
  };

  // 当 maskedText 改变后，若是随机 / 全部模式，自动找到第一个空位并生成选项
  useEffect(() => {
    if ((mode === 'random' || mode === 'all') && maskedText.length > 0) {
      const firstEmpty = findNextEmptyPosition(0, maskedText, mode === 'random' ? initialMask : undefined);
      setCurrentIndex(firstEmpty);

      if (firstEmpty !== -1) {
        setOptions(generateOptions(originalText[firstEmpty]));
      } else {
        setOptions([]);
      }
    }
  }, [maskedText, mode, originalText, initialMask]);

  // Debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setValidatedInput(userInput);
    }, 600);
    return () => clearTimeout(timer);
  }, [userInput]);

  // -------------------- 工具函数 --------------------
  const isPunctuation = (char: string) => {
    return /[\u3000-\u303f\uff00-\uff0f\uff1a-\uff20\uff3b-\uff40\uff5b-\uff65]/.test(char);
  };

  const generateOptions = (correctChar: string) => {
    const chars = Array.from(originalText).filter(char => !isPunctuation(char));
    const uniqueChars = Array.from(new Set(chars)).filter(char => char !== correctChar);
    const additionalChars = '之乎者也矣'.split('');
    const availableChars = [...uniqueChars, ...additionalChars];

    const randomChars = [];
    while (randomChars.length < 5 && availableChars.length > 0) {
      const randomIndex = Math.floor(Math.random() * availableChars.length);
      randomChars.push(availableChars[randomIndex]);
      availableChars.splice(randomIndex, 1);
    }

    const allOptions = [correctChar, ...randomChars.slice(0, 5)];
    return allOptions.sort(() => Math.random() - 0.5);
  };

  const createMaskedText = (text: string, mode: Mode) => {
    const chars = Array.from(text);
    let masked: (string | null)[];
    if (mode === 'free') {
      masked = chars.map(char => (isPunctuation(char) ? char : null));
    } else if (mode === 'all') {
      masked = chars.map(char => (isPunctuation(char) ? char : null));
    } else {
      // random
      masked = chars.map(char => {
        if (isPunctuation(char)) return char;
        return Math.random() > 0.5 ? null : char;
      });
    }
    if (mode === 'random') {
      setInitialMask([...masked]);
    }
    return masked;
  };

  const findNextEmptyPosition = (
    startIndex: number,
    text: (string | null)[],
    initialMask?: (string | null)[]
  ) => {
    for (let i = startIndex; i < text.length; i++) {
      if (!isPunctuation(originalText[i]) && text[i] === null && (!initialMask || initialMask[i] === null)) {
        return i;
      }
    }
    return -1;
  };

  // -------------------- 练习模式切换 --------------------
  const handleModeChange = (newMode: Mode) => {
    setMode(newMode);
    const newMasked = createMaskedText(originalText, newMode);
    setMaskedText(newMasked);
    setCurrentIndex(-1);
    setUserInput('');
    setValidatedInput('');
    setOptions([]);
    setCurrentSentenceStart(0);
  };

  // -------------------- 自由练习模式输入 --------------------
  useEffect(() => {
    if (mode === 'free' && validatedInput) {
      const newMasked = [...maskedText];
      let inputIndex = 0;
      let textIndex = currentSentenceStart;
      let segmentMatched = false;

      let nextPunctuation = currentSentenceStart;
      while (nextPunctuation < originalText.length && !isPunctuation(originalText[nextPunctuation])) {
        nextPunctuation++;
      }

      let firstMismatchFound = false;
      while (inputIndex < validatedInput.length && textIndex < originalText.length && !firstMismatchFound) {
        if (isPunctuation(originalText[textIndex])) {
          newMasked[textIndex] = originalText[textIndex];
          textIndex++;
          continue;
        }
        if (validatedInput[inputIndex] === originalText[textIndex]) {
          newMasked[textIndex] = validatedInput[inputIndex];
          if (textIndex === nextPunctuation - 1) {
            segmentMatched = true;
          }
        } else {
          firstMismatchFound = true;
          newMasked[textIndex] = null;
        }
        inputIndex++;
        textIndex++;
      }

      while (textIndex < nextPunctuation) {
        if (!isPunctuation(originalText[textIndex])) {
          newMasked[textIndex] = null;
        }
        textIndex++;
      }

      setMaskedText(newMasked);
      if (segmentMatched) {
        setUserInput('');
        setValidatedInput('');
        let nextSegmentStart = nextPunctuation + 1;
        while (nextSegmentStart < originalText.length && isPunctuation(originalText[nextSegmentStart])) {
          nextSegmentStart++;
        }
        setCurrentSentenceStart(nextSegmentStart);
      }
    }
  }, [validatedInput, mode, originalText, currentSentenceStart, maskedText]);

  // -------------------- 字符点击（随机 / 全部模式） --------------------
  const handleCharacterClick = (index: number) => {
    if (mode === 'free') return;
    if (maskedText[index] !== null) return;
    if (mode === 'random' && initialMask[index] !== null) return;

    setCurrentIndex(index);
    setOptions(generateOptions(originalText[index]));
    setUserInput('');
    setValidatedInput('');
  };

  // -------------------- 选项按钮点击 --------------------
  const handleOptionClick = (char: string) => {
    if (char === originalText[currentIndex]) {
      const newMasked = [...maskedText];
      newMasked[currentIndex] = char;
      setMaskedText(newMasked);

      const nextIndex = findNextEmptyPosition(
        currentIndex + 1,
        newMasked,
        mode === 'random' ? initialMask : undefined
      );
      setCurrentIndex(nextIndex);
      if (nextIndex !== -1) {
        setOptions(generateOptions(originalText[nextIndex]));
      } else {
        setOptions([]);
      }
    }
  };

  // -------------------- 自由练习输入框 --------------------
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUserInput(e.target.value);
  };

  const getCharacterStatus = (char: string, index: number): 'correct' | 'incorrect' | 'neutral' => {
    if (index >= validatedInput.length) return 'neutral';
    const targetIndex = currentSentenceStart + index;
    const targetChar = originalText[targetIndex];
    if (isPunctuation(targetChar)) {
      return 'neutral';
    }
    return char === targetChar ? 'correct' : 'incorrect';
  };

  // -------------------- 是否完成 --------------------
  const isQuestionCompleted = () => {
    if (questions.length === 0) return false;
    if (mode === 'random' || mode === 'all') {
      for (let i = 0; i < maskedText.length; i++) {
        if (!isPunctuation(originalText[i]) && maskedText[i] === null) {
          return false;
        }
      }
      return true;
    }
    if (mode === 'free' && currentSentenceStart >= originalText.length) {
      return true;
    }
    return false;
  };

  const questionDone = isQuestionCompleted();

  // 完成后 +1 计数
  useEffect(() => {
    if (questionDone) {
      const qIndex = currentQuestionIndex;
      ensureCompletionArrayLength(questions.length);

      setCompletions((prev) => {
        const newArr = [...prev];
        if (!newArr[qIndex]) {
          newArr[qIndex] = { random: 0, all: 0, free: 0 };
        }
        newArr[qIndex] = {
          ...newArr[qIndex],
          [mode]: newArr[qIndex][mode] + 1,
        };
        localStorage.setItem('completions', JSON.stringify(newArr));
        return newArr;
      });
    }
  }, [questionDone]);

  // -------------------- 后退 & 清空 --------------------
  const handleUndoChar = () => {
    if (mode === 'free') {
      let lastFilledIndex = currentSentenceStart - 1;
      while (
        lastFilledIndex >= 0 &&
        (maskedText[lastFilledIndex] === null || isPunctuation(originalText[lastFilledIndex]))
      ) {
        lastFilledIndex--;
      }
      if (lastFilledIndex >= 0) {
        const newMasked = [...maskedText];
        newMasked[lastFilledIndex] = null;
        setMaskedText(newMasked);
      }
    } else {
      if (currentIndex > 0) {
        const newMasked = [...maskedText];
        let prevIndex = currentIndex - 1;
        while (
          prevIndex >= 0 &&
          (isPunctuation(originalText[prevIndex]) || (mode === 'random' && initialMask[prevIndex] !== null))
        ) {
          prevIndex--;
        }
        if (prevIndex >= 0) {
          newMasked[prevIndex] = null;
          setMaskedText(newMasked);
          setCurrentIndex(prevIndex);
          setOptions(generateOptions(originalText[prevIndex]));
        }
      }
    }
  };

  const handleUndoSentence = () => {
    if (mode === 'free') {
      let prevStart = currentSentenceStart - 1;
      while (prevStart >= 0 && !isPunctuation(originalText[prevStart])) {
        prevStart--;
      }
      if (prevStart >= 0) {
        prevStart++;
        const newMasked = [...maskedText];
        for (let i = prevStart; i < currentSentenceStart; i++) {
          if (!isPunctuation(originalText[i])) {
            newMasked[i] = null;
          }
        }
        setMaskedText(newMasked);
        setCurrentSentenceStart(prevStart);
      }
    } else {
      let sentenceStart = currentIndex;
      while (sentenceStart > 0 && !isPunctuation(originalText[sentenceStart - 1])) {
        sentenceStart--;
      }
      const currentFirstEmpty = findNextEmptyPosition(
        sentenceStart,
        maskedText,
        mode === 'random' ? initialMask : undefined
      );
      if (currentIndex === currentFirstEmpty) {
        let prevSentenceStart = sentenceStart - 1;
        while (prevSentenceStart > 0 && !isPunctuation(originalText[prevSentenceStart - 1])) {
          prevSentenceStart--;
        }
        sentenceStart = prevSentenceStart;
      }
      let sentenceEnd = sentenceStart;
      while (sentenceEnd < originalText.length && !isPunctuation(originalText[sentenceEnd])) {
        sentenceEnd++;
      }
      const newMasked = [...maskedText];
      for (let i = sentenceStart; i <= sentenceEnd; i++) {
        if (!isPunctuation(originalText[i])) {
          if ((mode === 'all') || (mode === 'random' && initialMask[i] === null && maskedText[i] !== null)) {
            newMasked[i] = null;
          }
        }
      }
      setMaskedText(newMasked);
      const nextEmptyPos = findNextEmptyPosition(
        sentenceStart,
        newMasked,
        mode === 'random' ? initialMask : undefined
      );
      setCurrentIndex(nextEmptyPos);
      if (nextEmptyPos !== -1) {
        setOptions(generateOptions(originalText[nextEmptyPos]));
      } else {
        setOptions([]);
      }
    }
  };

  const handleClearAll = () => {
    if (mode === 'random') {
      const newMasked = maskedText.map((char, index) =>
        initialMask[index] === null ? null : maskedText[index]
      );
      setMaskedText(newMasked);
    } else {
      setMaskedText(createMaskedText(originalText, mode));
    }
    setCurrentIndex(-1);
    setOptions([]);
    if (mode === 'free') {
      setCurrentSentenceStart(0);
    }
  };

  // 重新做本题
  const handleRedoQuestion = () => {
    setTextByQuestion(questions, currentQuestionIndex);
  };

  // 显示作答提示
  const renderInstructionText = () => {
    if (mode === 'random' || mode === 'all') {
      return '请选择正确的下一个字';
    }
    if (mode === 'free') {
      return '请打出完整、正确的句子';
    }
    return '';
  };

  // Tailwind 过渡
  const questionCardClass =
    'bg-white/80 rounded-lg p-4 sm:p-6 shadow-lg transition-all ease-out duration-300';

  const questionDoneClass = isQuestionCompleted() ? '' : '';

  return (
    <div className="min-h-screen bg-[#f5e6d3] p-4 sm:p-8 flex flex-col gap-4">
      {/* 顶部标题：加大 */}
      <div className="text-center text-xl sm:text-2xl text-gray-700 font-bold">
        古文易遍通
      </div>

      {/* 第一行按钮区域：手机居中，sm以上左右分开 */}
      <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-between">
        {/* 左侧三按钮：导入题库 / 模式选择 / 选择题目 */}
        <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start">
          <button
            onClick={handleOpenModal}
            className="px-4 py-2 rounded bg-amber-700 text-white text-sm sm:text-base transition-all hover:scale-105"
          >
            导入题库
          </button>

          <select
            className="p-2 rounded border border-amber-200 text-sm sm:text-base bg-amber-100"
            value={mode}
            onChange={(e) => handleModeChange(e.target.value as Mode)}
          >
            <option value="random">随机挖空</option>
            <option value="all">全部挖空</option>
            <option value="free">自由练习</option>
          </select>

          <button
            onClick={handleOpenQuestionSelect}
            className="px-4 py-2 rounded bg-amber-100 border border-amber-200 text-sm sm:text-base transition-all hover:bg-amber-200"
          >
            选择题目
          </button>
        </div>

        {/* 右侧两按钮：上一题 / 下一题 */}
        {questions.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-end">
            <button
              className="px-3 py-2 bg-amber-50 border border-amber-200 rounded text-sm sm:text-base flex items-center gap-1 transition-all hover:bg-amber-100"
              onClick={handlePrevQuestion}
              disabled={currentQuestionIndex <= 0}
            >
              <ChevronLeft className="w-4 h-4" />
              上一题
            </button>
            <button
              className="px-3 py-2 bg-amber-50 border border-amber-200 rounded text-sm sm:text-base flex items-center gap-1 transition-all hover:bg-amber-100"
              onClick={handleNextQuestion}
              disabled={currentQuestionIndex >= questions.length - 1}
            >
              下一题
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* 题目与文段 */}
      <div className={`${questionCardClass} ${questionDoneClass}`}>
        {questions.length > 0 && currentQuestionIndex < questions.length && (
          <div className="mb-4">
            <h2 className="text-lg sm:text-xl font-bold text-gray-700 mb-2">
              第 {currentQuestionIndex + 1} 题 - {questions[currentQuestionIndex].title}
            </h2>
            <p className="text-sm sm:text-base text-gray-600">
              提示：{questions[currentQuestionIndex].hint}
            </p>
          </div>
        )}

        <div className="font-serif text-base sm:text-lg leading-relaxed bg-[#f5e6d3] min-h-[100px] sm:min-h-[150px] rounded border border-amber-200 p-2 sm:p-4 transition-all ease-out">
          {maskedText.map((char, index) => (
            <span
              key={index}
              onClick={() => handleCharacterClick(index)}
              className={`inline-block min-w-[1em] text-center ${
                char === null ? 'border-b-2 border-amber-800 cursor-pointer' : ''
              } ${index === currentIndex ? 'bg-amber-200' : ''}`}
            >
              {char || '　'}
            </span>
          ))}
        </div>
      </div>

      {/* 作答区 */}
      <div className={`${questionCardClass} relative flex flex-col gap-4`}>
        <div className="flex flex-col">
          <div className="text-gray-700 font-semibold text-sm sm:text-base">作答区</div>
          <div className="text-gray-500 text-xs sm:text-sm">{renderInstructionText()}</div>
        </div>

        {!questionDone && (
          <>
            {/* 选项按钮（随机 / 全部） */}
            {(mode === 'random' || mode === 'all') && options.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {options.map((char, index) => (
                  <button
                    key={index}
                    onClick={() => handleOptionClick(char)}
                    className="w-8 h-8 sm:w-10 sm:h-10 text-base sm:text-lg font-serif bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg flex items-center justify-center transition-all"
                  >
                    {char}
                  </button>
                ))}
              </div>
            )}

            {/* 自由练习输入框 */}
            {mode === 'free' && (
              <div className="relative font-serif text-base sm:text-lg w-full">
                <input
                  ref={inputRef}
                  type="text"
                  className="w-full p-2 sm:p-3 rounded border border-amber-200 bg-white text-transparent selection:bg-gray-200 caret-black transition-all"
                  placeholder="在此输入文字..."
                  value={userInput}
                  onChange={handleInputChange}
                />
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    WebkitTextFillColor: 'initial',
                    paddingTop: '0.8rem',
                    paddingLeft: '0.5rem',
                    paddingRight: '0.5rem',
                    lineHeight: '1.5',
                  }}
                >
                  {Array.from(userInput).map((char, index) => (
                    <span
                      key={index}
                      className={`${
                        getCharacterStatus(char, index) === 'correct'
                          ? 'text-green-600'
                          : getCharacterStatus(char, index) === 'incorrect'
                          ? 'text-red-600'
                          : ''
                      }`}
                    >
                      {char}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* 右上角三个按钮：退字、退句、清空（下移到 top-8） */}
            <div className="absolute top-8 right-3 flex gap-2">
              <button
                onClick={handleUndoChar}
                className="flex items-center gap-1 px-2 py-1 rounded bg-amber-50 hover:bg-amber-100 border border-amber-200 text-xs sm:text-sm transition-all"
                title="后退一个字"
              >
                <ArrowLeft className="w-4 h-4" />
                退字
              </button>
              <button
                onClick={handleUndoSentence}
                className="flex items-center gap-1 px-2 py-1 rounded bg-amber-50 hover:bg-amber-100 border border-amber-200 text-xs sm:text-sm transition-all"
                title="后退一句"
              >
                <Delete className="w-4 h-4" />
                退句
              </button>
              <button
                onClick={handleClearAll}
                className="flex items-center gap-1 px-2 py-1 rounded bg-amber-50 hover:bg-amber-100 border border-amber-200 text-xs sm:text-sm transition-all"
                title="清空"
              >
                <Eraser className="w-4 h-4" />
                清空
              </button>
            </div>
          </>
        )}

        {/* 完成时显示：下一题、重做本题 */}
        {questionDone && (
          <div className="flex items-center gap-4">
            <button
              onClick={() => handleNextQuestion()}
              disabled={currentQuestionIndex >= questions.length - 1}
              className="px-3 py-2 rounded bg-amber-700 text-white flex items-center gap-1 text-sm sm:text-base transition-all hover:scale-105"
            >
              下一题
              <ArrowRightCircle className="w-4 h-4" />
            </button>
            <button
              onClick={handleRedoQuestion}
              className="px-3 py-2 rounded bg-amber-50 text-gray-700 border border-amber-200 flex items-center gap-1 text-sm sm:text-base transition-all hover:bg-amber-100"
            >
              重做本题
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* 底部浅褐色小字：ZhehanZ开源项目Recitalist链接 & 补充题库链接 */}
      <div className="text-center text-xs text-amber-900 mt-6">
        由{' '}
        <a
          href="https://github.com/Zhehan-Z/recitalist"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          ZhehanZ 开源项目 Recitalist
        </a>{' '}
        提供技术支持 ｜{' '}
        <a
          href="https://github.com/Zhehan-Z/recitalist/issues"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          欢迎补充题库
        </a>
      </div>

      {/* 导入题库弹窗 */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4 sm:p-6 max-w-2xl w-full mx-4 relative">
            <h2 className="text-lg sm:text-xl font-bold mb-4">导入题库</h2>

            <label className="block mb-2 text-gray-700 text-sm sm:text-base">
              选择一个预设题库：
            </label>
            <select
              className="w-full p-2 border border-gray-300 rounded mb-4 text-sm sm:text-base"
              value={selectedPredefinedFile}
              onChange={handlePredefinedFileChange}
            >
              <option value="">（不使用预设题库）</option>
              {Object.entries(PREDEFINED_QUIZ_FILES).map(([fileName, displayName]) => (
                <option key={fileName} value={fileName}>
                  {displayName}
                </option>
              ))}
            </select>

            <p className="text-gray-600 mb-2 text-sm sm:text-base">
              或在下方自行粘贴/编辑题库文本，每道题用空行分隔，题目名称和提示用【】包含:
            </p>
            <textarea
              className="w-full p-2 sm:p-3 mb-4 border border-gray-300 rounded h-40 sm:h-48 text-sm sm:text-base"
              value={questionBankText}
              onChange={(e) => setQuestionBankText(e.target.value)}
            />

            <div className="flex justify-end gap-2">
              <button
                className="px-3 py-2 rounded bg-gray-300 text-gray-800 text-sm sm:text-base transition-all hover:scale-105"
                onClick={() => setShowModal(false)}
              >
                取消
              </button>
              <button
                className="px-3 py-2 rounded bg-amber-700 text-white text-sm sm:text-base transition-all hover:scale-105"
                onClick={handleSaveQuestionBank}
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 选择题目弹窗 */}
      {showQuestionSelectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4 sm:p-6 max-w-md w-full mx-4 relative">
            <h2 className="text-lg sm:text-xl font-bold mb-4">选择题目</h2>
            <div className="max-h-80 overflow-y-auto">
              {questions.map((q, idx) => {
                const cc = completions[idx] || { random: 0, all: 0, free: 0 };
                return (
                  <button
                    key={idx}
                    className="w-full text-left py-2 px-3 mb-2 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded transition-all"
                    onClick={() => handleQuestionSelect(idx)}
                  >
                    <div className="font-semibold text-sm sm:text-base">
                      第 {idx + 1} 题 - {q.title}
                    </div>
                    <div className="text-xs sm:text-sm text-gray-600">
                      提示：{q.hint}
                    </div>
                    <div className="text-xs sm:text-sm text-gray-700 mt-1">
                      完成次数：1({cc.random}) / 2({cc.all}) / 3({cc.free})
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="flex justify-end mt-2">
              <button
                onClick={handleCloseQuestionSelect}
                className="px-3 py-2 rounded bg-gray-300 text-gray-800 text-sm sm:text-base transition-all hover:scale-105"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;