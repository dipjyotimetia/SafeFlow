"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usePropertyStore } from "@/stores/property.store";
import { handleStoreError } from "@/lib/errors";
import { toast } from "sonner";
import type {
  Property,
  PropertyType,
  PropertyPurpose,
  PropertyStatus,
  AustralianState,
} from "@/types";
import {
  Building2,
  DollarSign,
  Home,
  Landmark,
  MapPin,
  Shield,
  User,
  Loader2,
} from "lucide-react";

// ============ Constants (outside component to avoid recreation) ============

const PROPERTY_TYPES: readonly { value: PropertyType; label: string }[] = [
  { value: "house", label: "House" },
  { value: "apartment", label: "Apartment" },
  { value: "townhouse", label: "Townhouse" },
  { value: "unit", label: "Unit" },
  { value: "land", label: "Land" },
  { value: "commercial", label: "Commercial" },
  { value: "industrial", label: "Industrial" },
] as const;

const PROPERTY_PURPOSES: readonly { value: PropertyPurpose; label: string }[] = [
  { value: "investment", label: "Investment" },
  { value: "owner-occupied", label: "Owner Occupied" },
  { value: "holiday", label: "Holiday Home" },
] as const;

const PROPERTY_STATUSES: readonly { value: PropertyStatus; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "sold", label: "Sold" },
  { value: "archived", label: "Archived" },
] as const;

const AUSTRALIAN_STATES: readonly { value: AustralianState; label: string }[] = [
  { value: "NSW", label: "New South Wales" },
  { value: "VIC", label: "Victoria" },
  { value: "QLD", label: "Queensland" },
  { value: "SA", label: "South Australia" },
  { value: "WA", label: "Western Australia" },
  { value: "TAS", label: "Tasmania" },
  { value: "NT", label: "Northern Territory" },
  { value: "ACT", label: "Australian Capital Territory" },
] as const;

// Max property value in dollars (~$100M to avoid overflow when converted to cents)
const MAX_PROPERTY_VALUE = 100000000;

// ============ Helper Functions ============

/** Convert cents to dollars string for display */
function centsToDisplay(cents: number | undefined): string {
  if (cents === undefined || cents === 0) return "";
  return (cents / 100).toString();
}

/** Convert dollars string to cents (with validation and overflow protection) */
function displayToCents(value: string): number {
  if (!value || value.trim() === "") return 0;
  const num = parseFloat(value);
  if (isNaN(num) || num < 0) return 0;
  // Prevent overflow - max ~$100M to stay within safe integer range
  if (num > MAX_PROPERTY_VALUE) return MAX_PROPERTY_VALUE * 100;
  return Math.round(num * 100);
}

/** Convert Date to local YYYY-MM-DD string (timezone-safe) */
function dateToLocalString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Parse YYYY-MM-DD string to local Date (timezone-safe with validation) */
function parseLocalDate(dateString: string): Date {
  // Validate format
  if (!dateString || !/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    throw new Error(`Invalid date format: ${dateString}`);
  }

  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  // Validate the date is real (e.g., not Feb 30)
  if (
    isNaN(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    throw new Error(`Invalid date: ${dateString}`);
  }

  return date;
}

/** Validate and sanitize monetary input */
function handleMoneyInput(
  value: string,
  setter: (v: string) => void,
  maxValue: number = MAX_PROPERTY_VALUE
): void {
  // Remove any non-numeric characters except decimal point
  const cleaned = value.replace(/[^0-9.]/g, "");

  // Handle multiple decimal points
  const parts = cleaned.split(".");
  if (parts.length > 2) return;

  // Limit to 2 decimal places
  if (parts[1]?.length > 2) return;

  // Prevent overflow
  const num = parseFloat(cleaned);
  if (!isNaN(num) && num > maxValue) return;

  setter(cleaned);
}

/** Validate and sanitize postcode input (4 digits only) */
function handlePostcodeInput(
  value: string,
  setter: (v: string) => void
): void {
  const cleaned = value.replace(/\D/g, "");
  if (cleaned.length <= 4) {
    setter(cleaned);
  }
}

/** Validate and sanitize phone input */
function handlePhoneInput(
  value: string,
  setter: (v: string) => void
): void {
  // Allow digits, spaces, and common phone characters
  const cleaned = value.replace(/[^0-9\s+()-]/g, "");
  if (cleaned.length <= 20) {
    setter(cleaned);
  }
}

/** Validate and sanitize percentage input */
function handlePercentInput(
  value: string,
  setter: (v: string) => void,
  maxPercent: number = 100
): void {
  const cleaned = value.replace(/[^0-9.]/g, "");
  const parts = cleaned.split(".");
  if (parts.length > 2) return;
  if (parts[1]?.length > 2) return;

  const num = parseFloat(cleaned);
  if (!isNaN(num) && num > maxPercent) return;

  setter(cleaned);
}

/** Validate and sanitize integer input */
function handleIntegerInput(
  value: string,
  setter: (v: string) => void,
  maxValue: number = 999
): void {
  // Allow clearing the field
  if (value === "") {
    setter("");
    return;
  }

  const cleaned = value.replace(/\D/g, "");
  if (cleaned === "") {
    setter("");
    return;
  }

  const num = parseInt(cleaned, 10);
  if (isNaN(num) || num > maxValue) return;
  setter(cleaned);
}

/** Safely parse a number, returning undefined if invalid */
function safeParseFloat(value: string | undefined): number | undefined {
  if (!value || value.trim() === "") return undefined;
  const num = parseFloat(value);
  return isNaN(num) ? undefined : num;
}

/** Safely parse an integer, returning undefined if invalid */
function safeParseInt(value: string | undefined): number | undefined {
  if (!value || value.trim() === "") return undefined;
  const num = parseInt(value, 10);
  return isNaN(num) ? undefined : num;
}

// ============ Types ============

interface PropertyFormProps {
  property?: Property;
  mode: "create" | "edit";
}

// ============ Component ============

export function PropertyForm({ property, mode }: PropertyFormProps) {
  const router = useRouter();
  const { createProperty, updateProperty } = usePropertyStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Basic Details
  const [address, setAddress] = useState(property?.address ?? "");
  const [suburb, setSuburb] = useState(property?.suburb ?? "");
  const [state, setState] = useState<AustralianState>(property?.state ?? "NSW");
  const [postcode, setPostcode] = useState(property?.postcode ?? "");
  const [propertyType, setPropertyType] = useState<PropertyType>(
    property?.propertyType ?? "house"
  );
  const [purpose, setPurpose] = useState<PropertyPurpose>(
    property?.purpose ?? "investment"
  );
  const [status, setStatus] = useState<PropertyStatus>(
    property?.status ?? "active"
  );

  // Purchase Details (timezone-safe date handling)
  const [purchasePrice, setPurchasePrice] = useState(
    centsToDisplay(property?.purchasePrice)
  );
  const [purchaseDate, setPurchaseDate] = useState(
    property?.purchaseDate
      ? dateToLocalString(new Date(property.purchaseDate))
      : ""
  );
  const [valuationAmount, setValuationAmount] = useState(
    centsToDisplay(property?.valuationAmount)
  );
  const [valuationDate, setValuationDate] = useState(
    property?.valuationDate
      ? dateToLocalString(new Date(property.valuationDate))
      : ""
  );

  // Purchase Costs
  const [stampDuty, setStampDuty] = useState(
    centsToDisplay(property?.stampDuty)
  );
  const [legalFees, setLegalFees] = useState(
    centsToDisplay(property?.legalFees)
  );
  const [buildingInspection, setBuildingInspection] = useState(
    centsToDisplay(property?.buildingInspection)
  );
  const [pestInspection, setPestInspection] = useState(
    centsToDisplay(property?.pestInspection)
  );
  const [conveyancingFees, setConveyancingFees] = useState(
    centsToDisplay(property?.conveyancingFees)
  );

  // Land & Building Split
  const [landValue, setLandValue] = useState(
    centsToDisplay(property?.landValue)
  );
  const [buildingValue, setBuildingValue] = useState(
    centsToDisplay(property?.buildingValue)
  );
  const [buildingAge, setBuildingAge] = useState(
    property?.buildingAge?.toString() ?? ""
  );

  // Insurance
  const [buildingInsurance, setBuildingInsurance] = useState(
    centsToDisplay(property?.buildingInsuranceAnnual)
  );
  const [landlordInsurance, setLandlordInsurance] = useState(
    centsToDisplay(property?.landlordInsuranceAnnual)
  );
  const [insurerName, setInsurerName] = useState(property?.insurerName ?? "");
  const [insuranceRenewalDate, setInsuranceRenewalDate] = useState(
    property?.insuranceRenewalDate
      ? dateToLocalString(new Date(property.insuranceRenewalDate))
      : ""
  );

  // Property Manager
  const [hasPropertyManager, setHasPropertyManager] = useState(
    property?.hasPropertyManager ?? false
  );
  const [propertyManagerName, setPropertyManagerName] = useState(
    property?.propertyManagerName ?? ""
  );
  const [propertyManagerCompany, setPropertyManagerCompany] = useState(
    property?.propertyManagerCompany ?? ""
  );
  const [propertyManagerEmail, setPropertyManagerEmail] = useState(
    property?.propertyManagerEmail ?? ""
  );
  const [propertyManagerPhone, setPropertyManagerPhone] = useState(
    property?.propertyManagerPhone ?? ""
  );
  const [managementFeePercent, setManagementFeePercent] = useState(
    property?.managementFeePercent?.toString() ?? ""
  );

  // Notes
  const [notes, setNotes] = useState(property?.notes ?? "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!address.trim()) {
      toast.error("Address is required");
      return;
    }
    if (!suburb.trim()) {
      toast.error("Suburb is required");
      return;
    }
    if (!postcode.trim() || !/^\d{4}$/.test(postcode)) {
      toast.error("Valid 4-digit postcode is required");
      return;
    }
    if (!purchasePrice || displayToCents(purchasePrice) === 0) {
      toast.error("Purchase price is required");
      return;
    }
    if (!purchaseDate) {
      toast.error("Purchase date is required");
      return;
    }

    setIsSubmitting(true);

    try {
      const propertyData = {
        address: address.trim(),
        suburb: suburb.trim(),
        state,
        postcode: postcode.trim(),
        propertyType,
        purpose,
        status,
        purchasePrice: displayToCents(purchasePrice),
        purchaseDate: parseLocalDate(purchaseDate),
        valuationAmount:
          displayToCents(valuationAmount) || displayToCents(purchasePrice),
        valuationDate: valuationDate ? parseLocalDate(valuationDate) : undefined,
        stampDuty: displayToCents(stampDuty),
        legalFees: displayToCents(legalFees),
        buildingInspection: displayToCents(buildingInspection) || undefined,
        pestInspection: displayToCents(pestInspection) || undefined,
        conveyancingFees: displayToCents(conveyancingFees) || undefined,
        landValue: displayToCents(landValue) || undefined,
        buildingValue: displayToCents(buildingValue) || undefined,
        buildingAge: safeParseInt(buildingAge),
        buildingInsuranceAnnual: displayToCents(buildingInsurance) || undefined,
        landlordInsuranceAnnual: displayToCents(landlordInsurance) || undefined,
        insurerName: insurerName.trim() || undefined,
        insuranceRenewalDate: insuranceRenewalDate
          ? parseLocalDate(insuranceRenewalDate)
          : undefined,
        hasPropertyManager,
        propertyManagerName: hasPropertyManager
          ? propertyManagerName.trim() || undefined
          : undefined,
        propertyManagerCompany: hasPropertyManager
          ? propertyManagerCompany.trim() || undefined
          : undefined,
        propertyManagerEmail: hasPropertyManager
          ? propertyManagerEmail.trim() || undefined
          : undefined,
        propertyManagerPhone: hasPropertyManager
          ? propertyManagerPhone.trim() || undefined
          : undefined,
        managementFeePercent: hasPropertyManager
          ? safeParseFloat(managementFeePercent)
          : undefined,
        notes: notes.trim() || undefined,
      };

      if (mode === "create") {
        const id = await createProperty(propertyData);
        toast.success("Property created successfully");
        router.push(`/property/${id}`);
      } else if (property) {
        await updateProperty(property.id, propertyData);
        toast.success("Property updated successfully");
        router.push(`/property/${property.id}`);
      }
    } catch (error) {
      handleStoreError("PropertyForm.handleSubmit", error);
      toast.error("Failed to save property");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      {/* Basic Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Home className="h-5 w-5" />
            Property Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="address">Street Address *</Label>
              <Input
                id="address"
                placeholder="123 Example Street"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                maxLength={200}
                aria-required="true"
                aria-describedby="address-hint"
              />
              <p id="address-hint" className="text-xs text-muted-foreground sr-only">
                Enter the full street address
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="suburb">Suburb *</Label>
              <Input
                id="suburb"
                placeholder="Sydney"
                value={suburb}
                onChange={(e) => setSuburb(e.target.value)}
                maxLength={100}
                aria-required="true"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="state">State *</Label>
                <Select
                  value={state}
                  onValueChange={(v) => setState(v as AustralianState)}
                >
                  <SelectTrigger id="state" aria-required="true">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AUSTRALIAN_STATES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="postcode">Postcode *</Label>
                <Input
                  id="postcode"
                  placeholder="2000"
                  value={postcode}
                  onChange={(e) => handlePostcodeInput(e.target.value, setPostcode)}
                  inputMode="numeric"
                  pattern="[0-9]{4}"
                  aria-required="true"
                  aria-describedby="postcode-hint"
                />
                <p id="postcode-hint" className="text-xs text-muted-foreground sr-only">
                  4-digit Australian postcode
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="propertyType">Property Type</Label>
              <Select
                value={propertyType}
                onValueChange={(v) => setPropertyType(v as PropertyType)}
              >
                <SelectTrigger id="propertyType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROPERTY_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="purpose">Purpose</Label>
              <Select
                value={purpose}
                onValueChange={(v) => setPurpose(v as PropertyPurpose)}
              >
                <SelectTrigger id="purpose">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROPERTY_PURPOSES.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {mode === "edit" && (
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={status}
                  onValueChange={(v) => setStatus(v as PropertyStatus)}
                >
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROPERTY_STATUSES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Purchase Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Purchase Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="purchasePrice">Purchase Price ($) *</Label>
              <Input
                id="purchasePrice"
                inputMode="decimal"
                placeholder="800000"
                value={purchasePrice}
                onChange={(e) => handleMoneyInput(e.target.value, setPurchasePrice)}
                aria-required="true"
                aria-describedby="purchasePrice-hint"
              />
              <p id="purchasePrice-hint" className="text-xs text-muted-foreground sr-only">
                Enter the purchase price in Australian dollars
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="purchaseDate">Purchase Date *</Label>
              <Input
                id="purchaseDate"
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                aria-required="true"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="valuationAmount">Current Valuation ($)</Label>
              <Input
                id="valuationAmount"
                inputMode="decimal"
                placeholder="900000"
                value={valuationAmount}
                onChange={(e) => handleMoneyInput(e.target.value, setValuationAmount)}
                aria-describedby="valuationAmount-hint"
              />
              <p id="valuationAmount-hint" className="text-xs text-muted-foreground">
                Defaults to purchase price if not set
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="valuationDate">Valuation Date</Label>
              <Input
                id="valuationDate"
                type="date"
                value={valuationDate}
                onChange={(e) => setValuationDate(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Purchase Costs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Landmark className="h-5 w-5" />
            Purchase Costs
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="stampDuty">Stamp Duty ($)</Label>
              <Input
                id="stampDuty"
                inputMode="decimal"
                placeholder="35000"
                value={stampDuty}
                onChange={(e) => handleMoneyInput(e.target.value, setStampDuty)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="legalFees">Legal/Conveyancing ($)</Label>
              <Input
                id="legalFees"
                inputMode="decimal"
                placeholder="2500"
                value={legalFees}
                onChange={(e) => handleMoneyInput(e.target.value, setLegalFees)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="buildingInspection">Building Inspection ($)</Label>
              <Input
                id="buildingInspection"
                inputMode="decimal"
                placeholder="500"
                value={buildingInspection}
                onChange={(e) => handleMoneyInput(e.target.value, setBuildingInspection)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pestInspection">Pest Inspection ($)</Label>
              <Input
                id="pestInspection"
                inputMode="decimal"
                placeholder="350"
                value={pestInspection}
                onChange={(e) => handleMoneyInput(e.target.value, setPestInspection)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="conveyancingFees">Other Fees ($)</Label>
              <Input
                id="conveyancingFees"
                inputMode="decimal"
                placeholder="500"
                value={conveyancingFees}
                onChange={(e) => handleMoneyInput(e.target.value, setConveyancingFees)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Land & Building Split */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Land & Building Split
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Used for depreciation calculations. Get this from your quantity
            surveyor or council rates notice.
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="landValue">Land Value ($)</Label>
              <Input
                id="landValue"
                inputMode="decimal"
                placeholder="400000"
                value={landValue}
                onChange={(e) => handleMoneyInput(e.target.value, setLandValue)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="buildingValue">Building Value ($)</Label>
              <Input
                id="buildingValue"
                inputMode="decimal"
                placeholder="400000"
                value={buildingValue}
                onChange={(e) => handleMoneyInput(e.target.value, setBuildingValue)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="buildingAge">Building Age (years)</Label>
              <Input
                id="buildingAge"
                inputMode="numeric"
                placeholder="15"
                value={buildingAge}
                onChange={(e) => handleIntegerInput(e.target.value, setBuildingAge, 200)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Insurance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Insurance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="buildingInsurance">
                Building Insurance ($/year)
              </Label>
              <Input
                id="buildingInsurance"
                inputMode="decimal"
                placeholder="1500"
                value={buildingInsurance}
                onChange={(e) => handleMoneyInput(e.target.value, setBuildingInsurance)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="landlordInsurance">
                Landlord Insurance ($/year)
              </Label>
              <Input
                id="landlordInsurance"
                inputMode="decimal"
                placeholder="500"
                value={landlordInsurance}
                onChange={(e) => handleMoneyInput(e.target.value, setLandlordInsurance)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="insurerName">Insurer</Label>
              <Input
                id="insurerName"
                placeholder="Terri Scheer"
                value={insurerName}
                onChange={(e) => setInsurerName(e.target.value)}
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="insuranceRenewalDate">Renewal Date</Label>
              <Input
                id="insuranceRenewalDate"
                type="date"
                value={insuranceRenewalDate}
                onChange={(e) => setInsuranceRenewalDate(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Property Manager */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Property Manager
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="hasPropertyManager">Has Property Manager</Label>
              <p className="text-xs text-muted-foreground">
                Is this property professionally managed?
              </p>
            </div>
            <Switch
              id="hasPropertyManager"
              checked={hasPropertyManager}
              onCheckedChange={setHasPropertyManager}
              aria-describedby="hasPropertyManager-hint"
            />
          </div>

          {hasPropertyManager && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="propertyManagerCompany">Company</Label>
                <Input
                  id="propertyManagerCompany"
                  placeholder="Ray White"
                  value={propertyManagerCompany}
                  onChange={(e) => setPropertyManagerCompany(e.target.value)}
                  maxLength={100}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="propertyManagerName">Contact Name</Label>
                <Input
                  id="propertyManagerName"
                  placeholder="John Smith"
                  value={propertyManagerName}
                  onChange={(e) => setPropertyManagerName(e.target.value)}
                  maxLength={100}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="propertyManagerEmail">Email</Label>
                <Input
                  id="propertyManagerEmail"
                  type="email"
                  placeholder="john@raywhite.com"
                  value={propertyManagerEmail}
                  onChange={(e) => setPropertyManagerEmail(e.target.value)}
                  maxLength={254}
                  aria-describedby="email-hint"
                />
                <p id="email-hint" className="text-xs text-muted-foreground sr-only">
                  Enter a valid email address
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="propertyManagerPhone">Phone</Label>
                <Input
                  id="propertyManagerPhone"
                  type="tel"
                  placeholder="0400 000 000"
                  value={propertyManagerPhone}
                  onChange={(e) => handlePhoneInput(e.target.value, setPropertyManagerPhone)}
                  aria-describedby="phone-hint"
                />
                <p id="phone-hint" className="text-xs text-muted-foreground sr-only">
                  Australian phone number
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="managementFeePercent">Management Fee (%)</Label>
                <Input
                  id="managementFeePercent"
                  inputMode="decimal"
                  placeholder="7.5"
                  value={managementFeePercent}
                  onChange={(e) => handlePercentInput(e.target.value, setManagementFeePercent, 25)}
                  aria-describedby="managementFee-hint"
                />
                <p id="managementFee-hint" className="text-xs text-muted-foreground">
                  Include GST (e.g., 7.5% inc GST)
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Notes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            id="notes"
            placeholder="Any additional notes about this property..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            maxLength={2000}
            aria-describedby="notes-hint"
          />
          <p id="notes-hint" className="text-xs text-muted-foreground mt-1">
            {notes.length}/2000 characters
          </p>
        </CardContent>
      </Card>

      {/* Submit Buttons */}
      <div className="flex gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {mode === "create" ? "Creating..." : "Saving..."}
            </>
          ) : mode === "create" ? (
            "Create Property"
          ) : (
            "Save Changes"
          )}
        </Button>
      </div>
    </form>
  );
}
