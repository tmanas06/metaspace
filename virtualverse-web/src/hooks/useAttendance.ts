import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi';
import { parseUnits } from 'viem';
import { ATTENDANCE_REGISTRY_ADDRESS } from '@/config/contracts';
import AttendanceRegistryABI from '@/abis/AttendanceRegistry.json';

const attendanceAbi = AttendanceRegistryABI as unknown as readonly any[];

export function useAttendance() {
  const { address } = useAccount();
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  const checkInCount = useReadContract({
    address: ATTENDANCE_REGISTRY_ADDRESS,
    abi: attendanceAbi,
    functionName: 'getUserCheckInCount',
    args: [address!],
    query: { enabled: !!address && !!ATTENDANCE_REGISTRY_ADDRESS },
  });

  const checkIns = useReadContract({
    address: ATTENDANCE_REGISTRY_ADDRESS,
    abi: attendanceAbi,
    functionName: 'getUserCheckIns',
    args: [address!],
    query: { enabled: !!address && !!ATTENDANCE_REGISTRY_ADDRESS },
  });

  const latestCheckIn = useReadContract({
    address: ATTENDANCE_REGISTRY_ADDRESS,
    abi: attendanceAbi,
    functionName: 'getLatestCheckIn',
    args: [address!],
    query: { enabled: !!address && !!ATTENDANCE_REGISTRY_ADDRESS },
  });

  const hasReachedThreshold = useReadContract({
    address: ATTENDANCE_REGISTRY_ADDRESS,
    abi: attendanceAbi,
    functionName: 'hasReachedThreshold',
    args: [address!],
    query: { enabled: !!address && !!ATTENDANCE_REGISTRY_ADDRESS },
  });

  const attendanceThreshold = useReadContract({
    address: ATTENDANCE_REGISTRY_ADDRESS,
    abi: attendanceAbi,
    functionName: 'attendanceThreshold',
    query: { enabled: !!ATTENDANCE_REGISTRY_ADDRESS },
  });

  return {
    checkInCount,
    checkIns,
    latestCheckIn,
    hasReachedThreshold,
    attendanceThreshold,
    hash,
    isPending,
    isConfirming,
    isConfirmed,
    error,
  };
}