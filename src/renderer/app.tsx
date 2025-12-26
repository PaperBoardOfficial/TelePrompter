import SubscribedApp from "@/renderer/pages/subscribed-app";
import { Toaster } from "@/renderer/components/common/toast";

function App() {
  return (
    <>
      <SubscribedApp />
      <Toaster
        position="top-right"
        className="md:max-w-[320px]"
        duration={4000}
      />
    </>
  );
}

export default App;
