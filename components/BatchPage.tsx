import React from 'react';
import BatchInputTable from './BatchInputTable';

export default function BatchPage() {
  return (
    <div className="max-w-3xl mx-auto py-10">
      <h2 className="text-2xl font-bold mb-6">Batch Flow</h2>
      <BatchInputTable />
    </div>
  );
}
