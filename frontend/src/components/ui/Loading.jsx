import React from 'react';

const Loading = () => {
  return (
    <div className="flex items-center justify-center h-screen w-full bg-background">
      <div className="h-12 w-12 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
    </div>
  );
};

export default Loading;
