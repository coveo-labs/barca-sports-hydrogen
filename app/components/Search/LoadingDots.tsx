export const LoadingDots = ({loadingText}: {loadingText: string[]}) => {
  const fullLoadingText: string[] = [];
  for (let i = 0; i < 5; i++) {
    fullLoadingText.push(loadingText[i % loadingText.length]);
  }

  return (
    <div className="flex items-center gap-4">
      <div className="text-md [text-wrap:balance] bg-clip-text text-transparent">
        <span className="text-indigo-500 inline-flex flex-col h-6 overflow-hidden">
          <ul className="block animate-text-slide-5 text-left leading-tight [&_li]:block">
            {fullLoadingText.map((text, i) => (
              <li key={i}>{text}</li>
            ))}
            <li aria-hidden>{loadingText[0]}</li>
          </ul>
        </span>
      </div>
      <div className="flex space-x-2 justify-center items-center">
        <div className="h-2 w-2 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
        <div className="h-2 w-2 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
        <div className="h-2 w-2 bg-gray-500 rounded-full animate-bounce"></div>
      </div>
    </div>
  );
};
