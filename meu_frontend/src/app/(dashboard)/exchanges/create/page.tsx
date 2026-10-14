import CreateExchangePage from "@/features/exchange/components/createEx";
import { requireAuth } from "@/lib/auth/session";

const Page = async () => {
  await requireAuth();
  return <CreateExchangePage />;
};

export default Page;
