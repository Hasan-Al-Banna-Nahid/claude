import ChatInterface from "@/app/components/Chat/ChatInterface";

export default function Page() {
  return (
    <main className="h-screen bg-[#fafafa] flex justify-center">
      <div className="w-full max-w-4xl h-full">
        <ChatInterface />
      </div>
    </main>
  );
}
