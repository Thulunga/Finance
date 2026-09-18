import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getSplitGroupMeta } from "@/app/actions/splitGroupActions";
import { SplitGroupClient } from "@/components/split/SplitGroupClient";

export const metadata: Metadata = {
  title: "Split Group",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function SplitGroupPage({
  params,
}: Readonly<{ params: Promise<{ slug: string }> }>) {
  const { slug } = await params;
  const meta = await getSplitGroupMeta(slug);

  if (!meta) {
    notFound();
  }

  return <SplitGroupClient slug={slug} meta={meta} />;
}
