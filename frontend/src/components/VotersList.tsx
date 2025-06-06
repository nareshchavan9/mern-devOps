import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Voter = {
  _id: string;
  fullName: string;
  email: string;
  age: number;
  voterID: string;
  isActive: boolean;
};

type VoterStats = {
  total: number;
  age18To60: number;
  age61Plus: number;
};

const VotersList = () => {
  const navigate = useNavigate();
  const [voters, setVoters] = useState<Voter[]>([]);
  const [stats, setStats] = useState<VoterStats>({
    total: 0,
    age18To60: 0,
    age61Plus: 0
  });
  const [loading, setLoading] = useState(true);
  const [selectedRange, setSelectedRange] = useState<string>('all');

  const fetchVoters = async (ageRange?: string) => {
    try {
      setLoading(true);
      const data = await authService.getAllVoters(ageRange);
      setVoters(data.voters);
      setStats(data.stats);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to fetch voters",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVoters();
  }, []);

  const handleRangeChange = (range: string) => {
    setSelectedRange(range);
    fetchVoters(range === 'all' ? undefined : range);
  };

  const handleDeactivateVoter = async (voterId: string) => {
    try {
      await authService.deactivateVoter(voterId);
      toast({
        title: "Success",
        description: "Voter has been deleted successfully",
      });
      // Refresh the list
      fetchVoters(selectedRange === 'all' ? undefined : selectedRange);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to delete voter",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end mb-4">
        <Button 
          variant="ghost" 
          onClick={() => navigate("/admin/dashboard")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Registered Voters</CardTitle>
          <div className="flex items-center gap-4 mt-4">
            <Button
              variant={selectedRange === 'all' ? "default" : "outline"}
              onClick={() => handleRangeChange('all')}
            >
              All ({stats.total})
            </Button>
            <Button
              variant={selectedRange === '18-60' ? "default" : "outline"}
              onClick={() => handleRangeChange('18-60')}
            >
              Age 18-60 ({stats.age18To60})
            </Button>
            <Button
              variant={selectedRange === '61+' ? "default" : "outline"}
              onClick={() => handleRangeChange('61+')}
            >
              Age 61+ ({stats.age61Plus})
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Age</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Voter ID</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {voters.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-4">
                      No voters found in this age range
                    </TableCell>
                  </TableRow>
                ) : (
                  voters.map((voter) => (
                    <TableRow key={voter._id}>
                      <TableCell>{voter.fullName}</TableCell>
                      <TableCell>{voter.age}</TableCell>
                      <TableCell>{voter.email}</TableCell>
                      <TableCell>{voter.voterID}</TableCell>
                      <TableCell>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeactivateVoter(voter._id)}
                        >
                          Delete
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default VotersList; 