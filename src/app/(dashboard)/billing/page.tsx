import BillingClient from "@/components/dashboard/billing/BillingClient";

export const metadata = {
  title: "Billing — Attentra",
};

export default function BillingPage() {
  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8 2xl:px-10">
      <BillingClient />
    </div>
  );
}
