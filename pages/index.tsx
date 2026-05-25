import Head from "next/head";
import ChatbotHomePage from "@/components/ChatbotHomePage";

export default function Home() {
  return (
    <>
      <Head>
        <title>FactCheck – Chatbot</title>
        <meta
          name="description"
          content="Ask questions and verify facts with the FactCheck chatbot."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <ChatbotHomePage />
    </>
  );
}
