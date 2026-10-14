import CreateCredentialPage from "@/features/credentials/components/createCred";
import { requireAuth } from "@/lib/auth/session";

const Page = async () => {
  await requireAuth();
  return <CreateCredentialPage />;
};

export default Page;
