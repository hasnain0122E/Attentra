import { notFound } from "next/navigation";

import RequestDetailHeader from "@/components/dashboard/history/detail/RequestDetailHeader";
import RequestExecutionPath from "@/components/dashboard/history/detail/RequestExecutionPath";
import RequestMetadataGrid from "@/components/dashboard/history/detail/RequestMetadataGrid";
import RequestPromptResponse from "@/components/dashboard/history/detail/RequestPromptResponse";
import RequestRoutingOverview from "@/components/dashboard/history/detail/RequestRoutingOverview";

import {
  getRequestHistoryItem,
  requestHistory,
} from "@/lib/dashboard/history-data";

interface RequestDetailPageProps {
  params: {
    requestId: string;
  };
}

export function generateStaticParams() {
  return requestHistory.map((request) => ({
    requestId: request.id,
  }));
}

export default function RequestDetailPage({
  params,
}: RequestDetailPageProps) {
  const request = getRequestHistoryItem(
    params.requestId,
  );

  if (!request) {
    notFound();
  }

  return (
    <div>
      <RequestDetailHeader
        request={request}
      />

      <div className="space-y-5">
        {/* Most important user-facing information */}
        <RequestPromptResponse
          request={request}
        />

        {/* Routing decision */}
        <RequestRoutingOverview
          request={request}
        />

        {/* Execution telemetry */}
        <RequestMetadataGrid
          request={request}
        />

        {/* Full attempt chain */}
        <RequestExecutionPath
          request={request}
        />
      </div>
    </div>
  );
}