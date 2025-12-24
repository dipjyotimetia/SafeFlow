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
import { Separator } from "@/components/ui/separator";
import { usePropertyStore } from "@/stores/property.store";
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
  Calendar,
  DollarSign,
  Home,
  Landmark,
  MapPin,
  Shield,
  User,
  Loader2,
} from "lucide-react";

interface PropertyFormProps {
  property?: Property;
  mode: "create" | "edit";
}

const PROPERTY_TYPES: { value: PropertyType; label: string }[] = [
  { value: "house", label: "House" },
  { value: "apartment", label: "Apartment" },
  { value: "townhouse", label: "Townhouse" },
  { value: "unit", label: "Unit" },
  { value: "land", label: "Land" },
  { value: "commercial", label: "Commercial" },
  { value: "industrial", label: "Industrial" },
];

const PROPERTY_PURPOSES: { value: PropertyPurpose; label: string }[] = [
  { value: "investment", label: "Investment" },
  { value: "owner-occupied", label: "Owner Occupied" },
  { value: "holiday", label: "Holiday Home" },
];

const PROPERTY_STATUSES: { value: PropertyStatus; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "sold", label: "Sold" },
  { value: "archived", label: "Archived" },
];

const AUSTRALIAN_STATES: { value: AustralianState; label: string }[] = [
  { value: "NSW", label: "New South Wales" },
  { value: "VIC", label: "Victoria" },
  { value: "QLD", label: "Queensland" },
  { value: "SA", label: "South Australia" },
  { value: "WA", label: "Western Australia" },
  { value: "TAS", label: "Tasmania" },
  { value: "NT", label: "Northern Territory" },
  { value: "ACT", label: "Australian Capital Territory" },
];

// Helper to convert cents to dollars for display
function centsToDisplay(cents: number | undefined): string {
  if (cents === undefined || cents === 0) return "";
  return (cents / 100).toString();
}

// Helper to convert dollars string to cents
function displayToCents(value: string): number {
  const num = parseFloat(value);
  return isNaN(num) ? 0 : Math.round(num * 100);
}

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

  // Purchase Details
  const [purchasePrice, setPurchasePrice] = useState(
    centsToDisplay(property?.purchasePrice)
  );
  const [purchaseDate, setPurchaseDate] = useState(
    property?.purchaseDate
      ? new Date(property.purchaseDate).toISOString().split("T")[0]
      : ""
  );
  const [valuationAmount, setValuationAmount] = useState(
    centsToDisplay(property?.valuationAmount)
  );
  const [valuationDate, setValuationDate] = useState(
    property?.valuationDate
      ? new Date(property.valuationDate).toISOString().split("T")[0]
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
      ? new Date(property.insuranceRenewalDate).toISOString().split("T")[0]
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
    if (!postcode.trim()) {
      toast.error("Postcode is required");
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
        purchaseDate: new Date(purchaseDate),
        valuationAmount:
          displayToCents(valuationAmount) || displayToCents(purchasePrice),
        valuationDate: valuationDate ? new Date(valuationDate) : undefined,
        stampDuty: displayToCents(stampDuty),
        legalFees: displayToCents(legalFees),
        buildingInspection: displayToCents(buildingInspection) || undefined,
        pestInspection: displayToCents(pestInspection) || undefined,
        conveyancingFees: displayToCents(conveyancingFees) || undefined,
        landValue: displayToCents(landValue) || undefined,
        buildingValue: displayToCents(buildingValue) || undefined,
        buildingAge: buildingAge ? parseInt(buildingAge) : undefined,
        buildingInsuranceAnnual: displayToCents(buildingInsurance) || undefined,
        landlordInsuranceAnnual: displayToCents(landlordInsurance) || undefined,
        insurerName: insurerName.trim() || undefined,
        insuranceRenewalDate: insuranceRenewalDate
          ? new Date(insuranceRenewalDate)
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
        managementFeePercent: hasPropertyManager && managementFeePercent
          ? parseFloat(managementFeePercent)
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
      console.error("Failed to save property:", error);
      toast.error("Failed to save property");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
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
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="suburb">Suburb *</Label>
              <Input
                id="suburb"
                placeholder="Sydney"
                value={suburb}
                onChange={(e) => setSuburb(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="state">State *</Label>
                <Select
                  value={state}
                  onValueChange={(v) => setState(v as AustralianState)}
                >
                  <SelectTrigger id="state">
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
                  onChange={(e) => setPostcode(e.target.value)}
                  maxLength={4}
                  required
                />
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
                type="number"
                placeholder="800000"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="purchaseDate">Purchase Date *</Label>
              <Input
                id="purchaseDate"
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="valuationAmount">Current Valuation ($)</Label>
              <Input
                id="valuationAmount"
                type="number"
                placeholder="900000"
                value={valuationAmount}
                onChange={(e) => setValuationAmount(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
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
                type="number"
                placeholder="35000"
                value={stampDuty}
                onChange={(e) => setStampDuty(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="legalFees">Legal/Conveyancing ($)</Label>
              <Input
                id="legalFees"
                type="number"
                placeholder="2500"
                value={legalFees}
                onChange={(e) => setLegalFees(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="buildingInspection">Building Inspection ($)</Label>
              <Input
                id="buildingInspection"
                type="number"
                placeholder="500"
                value={buildingInspection}
                onChange={(e) => setBuildingInspection(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pestInspection">Pest Inspection ($)</Label>
              <Input
                id="pestInspection"
                type="number"
                placeholder="350"
                value={pestInspection}
                onChange={(e) => setPestInspection(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="conveyancingFees">Other Fees ($)</Label>
              <Input
                id="conveyancingFees"
                type="number"
                placeholder="500"
                value={conveyancingFees}
                onChange={(e) => setConveyancingFees(e.target.value)}
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
                type="number"
                placeholder="400000"
                value={landValue}
                onChange={(e) => setLandValue(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="buildingValue">Building Value ($)</Label>
              <Input
                id="buildingValue"
                type="number"
                placeholder="400000"
                value={buildingValue}
                onChange={(e) => setBuildingValue(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="buildingAge">Building Age (years)</Label>
              <Input
                id="buildingAge"
                type="number"
                placeholder="15"
                value={buildingAge}
                onChange={(e) => setBuildingAge(e.target.value)}
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
                type="number"
                placeholder="1500"
                value={buildingInsurance}
                onChange={(e) => setBuildingInsurance(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="landlordInsurance">
                Landlord Insurance ($/year)
              </Label>
              <Input
                id="landlordInsurance"
                type="number"
                placeholder="500"
                value={landlordInsurance}
                onChange={(e) => setLandlordInsurance(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="insurerName">Insurer</Label>
              <Input
                id="insurerName"
                placeholder="Terri Scheer"
                value={insurerName}
                onChange={(e) => setInsurerName(e.target.value)}
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
              <Label htmlFor="hasPropertyManager">
                Has Property Manager
              </Label>
              <p className="text-xs text-muted-foreground">
                Is this property professionally managed?
              </p>
            </div>
            <Switch
              id="hasPropertyManager"
              checked={hasPropertyManager}
              onCheckedChange={setHasPropertyManager}
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
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="propertyManagerName">Contact Name</Label>
                <Input
                  id="propertyManagerName"
                  placeholder="John Smith"
                  value={propertyManagerName}
                  onChange={(e) => setPropertyManagerName(e.target.value)}
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
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="propertyManagerPhone">Phone</Label>
                <Input
                  id="propertyManagerPhone"
                  placeholder="0400 000 000"
                  value={propertyManagerPhone}
                  onChange={(e) => setPropertyManagerPhone(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="managementFeePercent">
                  Management Fee (%)
                </Label>
                <Input
                  id="managementFeePercent"
                  type="number"
                  step="0.1"
                  placeholder="7.5"
                  value={managementFeePercent}
                  onChange={(e) => setManagementFeePercent(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
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
            placeholder="Any additional notes about this property..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
          />
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
