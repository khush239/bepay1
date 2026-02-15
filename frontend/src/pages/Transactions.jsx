
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { LucideSearch, LucideArrowUpRight, LucideArrowDownLeft, LucideArrowRightLeft, LucideFilter } from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"


export default function TransactionsPage() {
    const [transactions, setTransactions] = useState([]);
    const [userId, setUserId] = useState('');
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [txRes, userRes] = await Promise.all([
                    api.get('/payouts'),
                    api.get('/auth/me')
                ]);
                setTransactions(txRes.data);
                setUserId(userRes.data.user.id);
            } catch (error) {
                console.error('Failed to fetch transactions', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
     const interval = setInterval(fetchData, 5000); // Poll every 5 seconds
        return () => clearInterval(interval);
    }, []);

    const filteredTransactions = transactions.filter(t => {
        const statusMatch = statusFilter === 'ALL' || t.status === statusFilter;
        return statusMatch;
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h1 className="text-3xl font-bold tracking-tight">Transactions</h1>
            </div>

            <Card className="border-none shadow-sm">
                <CardHeader>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <CardTitle>Transaction History</CardTitle>
                            <CardDescription>View and manage all your incoming and outgoing transactions.</CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="w-[130px]">
                                    <div className="flex items-center gap-2">
                                        <LucideFilter className="h-4 w-4" />
                                        <SelectValue placeholder="Status" />
                                    </div>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">All Status</SelectItem>
                                    <SelectItem value="COMPLETED">Completed</SelectItem>
                                    <SelectItem value="PENDING">Pending</SelectItem>
                                    <SelectItem value="FAILED">Failed</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/50">
                                    <TableHead className="w-[300px]">Transaction</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Amount</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Date</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center">
                                            Loading transactions...
                                        </TableCell>
                                    </TableRow>
                                ) : filteredTransactions.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                            No transactions found matching your filters.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredTransactions.map((tx) => {
                                        const isInternal = tx.type === 'INTERNAL';
                                        const receiverId = tx.receiverId?._id || tx.receiverId;
                                        const isIncoming = isInternal && receiverId?.toString() === userId?.toString();

                                        // Determine icon and color
                                        let Icon = LucideArrowUpRight;
                                        let iconBg = 'bg-red-100';
                                        let iconColor = 'text-red-600';
                                        let amountColor = '';
                                        let amountPrefix = '-';

                                        if (isIncoming) {
                                            Icon = LucideArrowDownLeft;
                                            iconBg = 'bg-emerald-100';
                                            iconColor = 'text-emerald-600';
                                            amountColor = 'text-emerald-600';
                                            amountPrefix = '+';
                                        }

                                        return (
                                            <TableRow key={tx._id || tx.id} className="hover:bg-muted/50 transition-colors">
                                                <TableCell>
                                                    <div className="flex items-center gap-3">
                                                        <div className={`h-9 w-9 rounded-full flex items-center justify-center ${iconBg} ${iconColor}`}>
                                                            <Icon className="h-4 w-4" />
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="font-medium">
                                                                {isInternal
                                                                    ? (isIncoming ? `From ${tx.sender?.name || 'Unknown'}` : `To ${tx.receiver?.name || 'Unknown'}`)
                                                                    : `To ${tx.beneficiary?.name || 'Unknown'}`}
                                                            </span>
                                                            <span className="text-xs text-muted-foreground font-mono">
                                                                {(tx._id || tx.id || "").slice(0, 12)}...
                                                            </span>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center text-sm text-muted-foreground">
                                                        {tx.type === 'INTERNAL' ? (
                                                            <span className="flex items-center gap-1">
                                                                <LucideArrowRightLeft className="h-3 w-3" /> Internal
                                                            </span>
                                                        ) : 'External'}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <span className={`font-semibold ${amountColor}`}>
                                                        {amountPrefix}{tx.amount.toLocaleString()} <span className="text-muted-foreground text-xs font-normal">{tx.currency}</span>
                                                    </span>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={tx.status === 'COMPLETED' ? 'default' : tx.status === 'FAILED' ? 'destructive' : 'secondary'}
                                                        className={tx.status === 'COMPLETED' ? "bg-emerald-500 hover:bg-emerald-600 text-white border-0" : ""}>
                                                        {tx.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right text-muted-foreground">
                                                    {new Date(tx.createdAt).toLocaleDateString()}
                                                    <span className="text-xs ml-1 opacity-70">
                                                        {new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
