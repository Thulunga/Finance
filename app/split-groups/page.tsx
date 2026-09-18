import type { Metadata } from "next";

import { CreateSplitGroup } from "@/components/split/CreateSplitGroup";

export const metadata: Metadata = {
  title: "Split Groups",
  description: "Create a shareable group to split expenses with anyone.",
  robots: { index: false, follow: false },
};

export default function SplitGroupsPage() {
  return <CreateSplitGroup />;
}
