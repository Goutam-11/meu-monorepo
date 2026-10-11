import { useTRPC } from "@/trpc/client"
import { keepPreviousData, useMutation, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export const useAgents = ({ page, search }: {
  page: number;
  search: string;
}) => {
  const trpc = useTRPC();
  
  return useQuery(trpc.agents.getAll.queryOptions({ page, search }, {
    placeholderData: keepPreviousData,
    throwOnError: true,
  }))
}

export const useSuspenseAgent = (id:string) => {
  const trpc = useTRPC();
  
  return useSuspenseQuery(trpc.agents.getOne.queryOptions({ id: id }, {
    refetchInterval: query => query.state.data?.status === "RUNNING" ? 15_000 : false,
    refetchOnWindowFocus: true,
  }))
}

export const useCreateAgent = () => { 
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  
  return useMutation(trpc.agents.create.mutationOptions({
    onSuccess: () => {
      toast.success("Agent created successfully");
      queryClient.invalidateQueries(trpc.agents.getAll.queryOptions({}));
    },
    onError: (error) => {
      toast.error(`Error creating agent: ${error.message}`);
    }
  }));
}
export const useUpdateAgent = () => { 
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const router = useRouter();
  
  return useMutation(trpc.agents.update.mutationOptions({
    onSuccess: (data) => {
      toast.success("Agent updated successfully");
      void queryClient.invalidateQueries({ queryKey: trpc.agents.getAll.queryKey() });
      void queryClient.invalidateQueries(trpc.agents.getOne.queryOptions({ id: data.id }));
      router.push(`/agents/${data.id}`);
    },
    onError: (error) => {
      toast.error(`Error updating agent: ${error.message}`);
    }
  }));
}

export const useDeleteAgent = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  
  return useMutation(trpc.agents.delete.mutationOptions({
    onSuccess: (data) => {
      toast.success("Agent deleted successfully");
      queryClient.invalidateQueries(trpc.agents.getAll.queryOptions({}));
      queryClient.invalidateQueries(trpc.agents.getOne.queryOptions({ id: data.id }));
    },
    onError: (error) => {
      toast.error(`Error deleting agent: ${error.message}`);
    }
  }));
}

export const useStatusChangeAgent = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  
  return useMutation(trpc.agents.statusChange.mutationOptions({
    onSuccess: (data) => {
      toast.success("Agent status changed successfully");
      queryClient.invalidateQueries(trpc.agents.getAll.queryOptions({}));
      queryClient.invalidateQueries(trpc.agents.getOne.queryOptions({ id: data.id }));
    },
    onError: (error) => {
      toast.error(`Error changing agent status: ${error.message}`);
    }
  }));
}

export const useSuspenseRuns = (id:string) => {
  const trpc = useTRPC();
  return useSuspenseQuery(trpc.agents.runs.queryOptions({ agentId: id }));
}
