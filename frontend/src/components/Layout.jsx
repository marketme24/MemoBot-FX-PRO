import React from "react";
import TickerBar from "./TickerBar";
import Sidebar from "./Sidebar";

export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <TickerBar />
      <div className="flex">
        <Sidebar />
        <main data-testid="main-content" className="flex-1 min-h-[calc(100vh-40px)] p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
