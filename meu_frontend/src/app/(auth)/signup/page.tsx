import SignupForm from "@/features/auth/components/signup"
import { requireNoAuth } from "@/lib/auth/session";

const Page = async () => {
  await requireNoAuth();
  return <SignupForm/>
};

export default Page;