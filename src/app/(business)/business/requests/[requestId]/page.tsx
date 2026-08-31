import { notFound } from "next/navigation";

import BusinessRequestDetailHeader from "@/components/business/requests/detail/BusinessRequestDetailHeader";
import BusinessRequestExecution from "@/components/business/requests/detail/BusinessRequestExecution";
import BusinessRequestPromptResponse from "@/components/business/requests/detail/BusinessRequestPromptResponse";
import BusinessRequestRouting from "@/components/business/requests/detail/BusinessRequestRouting";
import BusinessRequestTelemetry from "@/components/business/requests/detail/BusinessRequestTelemetry";

import {
  businessRequests,
  getBusinessRequest,
} from "@/lib/business/request-data";

interface BusinessRequestDetailPageProps {
  params: {
    requestId: string;
  };
}

export function generateStaticParams() {
  return businessRequests.map(
    (request) => ({
      requestId: request.id,
    }),
  );
}

export default function BusinessRequestDetailPage({
  params,
}: BusinessRequestDetailPageProps) {
  const request =
    getBusinessRequest(
      params.requestId,
    );

  if (!request) {
    notFound();
  }

  return (
    <div>
      <BusinessRequestDetailHeader
        request={request}
      />

      <div className="space-y-5">
        <BusinessRequestPromptResponse
          request={request}
        />

        <BusinessRequestRouting
          request={request}
        />

        <BusinessRequestTelemetry
          request={request}
        />

        <BusinessRequestExecution
          request={request}
        />
      </div>
    </div>
  );
}