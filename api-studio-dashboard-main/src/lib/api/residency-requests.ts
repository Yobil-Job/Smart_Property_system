export interface ResidencyClaim {
  id: string;
  userId?: string;
  email: string;
  fullName: string;
  phoneNumber?: string;
  propertyId: string;
  propertyName: string;
  buildingId: string;
  buildingName: string;
  apartmentId: string;
  apartmentNumber: string;
  moveInDate: string;
  emergencyContact?: string;
  notes?: string;
  status: "Pending" | "Approved" | "Rejected";
  createdAt: string;
}

const STORAGE_KEY = "smartproperty_residency_claims";

export function getResidencyClaims(): ResidencyClaim[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveResidencyClaim(
  claimData: Omit<ResidencyClaim, "id" | "createdAt" | "status">
): ResidencyClaim {
  const claims = getResidencyClaims();
  
  // Remove existing pending claim for the same email or userId if any
  const filtered = claims.filter(
    (c) =>
      c.email.toLowerCase() !== claimData.email.toLowerCase() &&
      (!claimData.userId || c.userId !== claimData.userId)
  );

  const newClaim: ResidencyClaim = {
    ...claimData,
    id: `claim-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    status: "Pending",
    createdAt: new Date().toISOString(),
  };

  filtered.unshift(newClaim);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  return newClaim;
}

export function getClaimByEmailOrUserId(
  email?: string,
  userId?: string
): ResidencyClaim | undefined {
  const claims = getResidencyClaims();
  return claims.find(
    (c) =>
      (email && c.email.toLowerCase() === email.toLowerCase()) ||
      (userId && c.userId === userId)
  );
}

export function approveResidencyClaim(emailOrUserId: string): void {
  const claims = getResidencyClaims();
  const updated = claims.map((c) => {
    if (
      c.email.toLowerCase() === emailOrUserId.toLowerCase() ||
      c.userId === emailOrUserId
    ) {
      return { ...c, status: "Approved" as const };
    }
    return c;
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

export function rejectResidencyClaim(emailOrUserId: string): void {
  const claims = getResidencyClaims();
  const updated = claims.map((c) => {
    if (
      c.email.toLowerCase() === emailOrUserId.toLowerCase() ||
      c.userId === emailOrUserId
    ) {
      return { ...c, status: "Rejected" as const };
    }
    return c;
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

