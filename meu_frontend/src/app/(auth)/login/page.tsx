import LoginForm from "@/features/auth/components/login"
import { requireNoAuth } from "@/lib/auth/session";

const Page = async () => {
  await requireNoAuth();
  return <LoginForm/>
};

export default Page;