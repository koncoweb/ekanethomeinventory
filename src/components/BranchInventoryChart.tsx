"use client";

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface BranchInventoryData {
  name: string;
  totalQuantity: number;
}

interface BranchInventoryChartProps {
  data: BranchInventoryData[];
  loading: boolean;
}

const BranchInventoryChart: React.FC<BranchInventoryChartProps> = ({ data, loading }) => {
  return (
    <Card className="md:col-span-2">
      <CardHeader>
        <CardTitle>Inventory Distribution by Branch</CardTitle>
        <CardDescription>Total quantity of items in each branch.</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-[300px] w-full" />
        ) : data.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="totalQuantity" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">No inventory data available for branches.</p>
        )}
      </CardContent>
    </Card>
  );
};

export default BranchInventoryChart;