export function DashboardPage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Overview of your financial health</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="card">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Total Balance</h3>
          <p className="text-2xl font-bold text-gray-900">$12,456.78</p>
          <p className="text-sm text-green-600">+2.5% from last month</p>
        </div>

        <div className="card">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Monthly Income</h3>
          <p className="text-2xl font-bold text-gray-900">$5,200.00</p>
          <p className="text-sm text-green-600">+5.2% from last month</p>
        </div>

        <div className="card">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Monthly Expenses</h3>
          <p className="text-2xl font-bold text-gray-900">$3,847.23</p>
          <p className="text-sm text-red-600">+8.1% from last month</p>
        </div>

        <div className="card">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Savings Rate</h3>
          <p className="text-2xl font-bold text-gray-900">26%</p>
          <p className="text-sm text-blue-600">Target: 30%</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Recent Transactions</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium">Grocery Store</p>
                <p className="text-sm text-gray-500">Food & Dining</p>
              </div>
              <span className="text-red-600">-$87.45</span>
            </div>
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium">Salary Deposit</p>
                <p className="text-sm text-gray-500">Income</p>
              </div>
              <span className="text-green-600">+$2,600.00</span>
            </div>
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium">Electric Bill</p>
                <p className="text-sm text-gray-500">Bills & Utilities</p>
              </div>
              <span className="text-red-600">-$124.78</span>
            </div>
          </div>
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Spending by Category</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span>Food & Dining</span>
              <span className="font-medium">$456.78</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Transportation</span>
              <span className="font-medium">$234.50</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Bills & Utilities</span>
              <span className="font-medium">$189.23</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Shopping</span>
              <span className="font-medium">$167.89</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}