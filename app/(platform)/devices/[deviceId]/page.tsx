import { DeviceDetailPanel } from "@/modules/devices/components/device-detail-panel";

interface DeviceDetailPageProps {
  params: {
    deviceId: string;
  };
}

export default function DeviceDetailPage({ params }: DeviceDetailPageProps) {
  return <DeviceDetailPanel deviceId={params.deviceId} />;
}
