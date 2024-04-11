"use client";
import React from "react";
import { Input } from "./ui/input";
import { useChat } from "ai/react";
import { Send } from "lucide-react";
import { Button } from "./ui/button";

type Props = {};

const ChatComponent = (props: Props) => {
  const { input, handleInputChange, handleSubmit } = useChat();
  return (
    <div className="reelative max-h-screen overflow-scroll">
      <div className="stick top-0 inset-x-0 p-2 bg-white h-fit">
        <h3 className="text-x1 font-bold">Chat</h3>
      </div>

      {/* message list */}
      <form onSubmit={handleSubmit}>
        <Input
          value={input}
          onChange={handleInputChange}
          placeholder="Ask any questions"
          className="w-full"
        />
        <Button className="bg-blue-600 m1-2">
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
};

export default ChatComponent;
