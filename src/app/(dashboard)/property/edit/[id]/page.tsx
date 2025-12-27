import EditPropertyClient from "./edit-property-client";

// Required for static export with empty params since property IDs are dynamic UUIDs
// stored in client-side IndexedDB. Client-side routing handles the actual ID resolution.
export async function generateStaticParams() {
  // Return at least one placeholder param for the build to generate the route shell
  return [{ id: '_' }];
}

export default function EditPropertyPage() {
  return <EditPropertyClient />;
}
