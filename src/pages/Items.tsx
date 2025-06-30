import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

const Items = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Item Management</CardTitle>
        <CardDescription>Here you can manage your inventory items.</CardDescription>
      </CardHeader>
      <CardContent>
        <p>Item management functionality will be implemented here.</p>
      </CardContent>
    </Card>
  );
};
export default Items;