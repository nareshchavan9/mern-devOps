import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { 
  Dialog, 
  DialogContent,
  DialogDescription, 
  DialogFooter,
  DialogHeader,
  DialogTitle 
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Calendar, Clock, Info, User, Loader2, Vote, Edit, Trash2 } from "lucide-react";
import { electionService, authService } from "@/services/api";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Candidate = {
  _id: string;
  name: string;
  party: string;
  bio: string;
};

type Election = {
  _id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  status: string;
  candidates: Candidate[];
};

const ElectionDetails = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [election, setElection] = useState<Election | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [isLoadingResults, setIsLoadingResults] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Check authentication status and admin role
    const user = authService.getCurrentUser();
    setIsAuthenticated(!!user);
    setIsAdmin(user?.role === 'admin');

    const fetchElection = async () => {
      if (!id) {
        setError("Election ID is missing");
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const data = await electionService.getElectionDetails(id);
        setElection(data);

        // Check if user has voted in this election
        if (isAuthenticated) {
          try {
            const voteStatus = await electionService.checkVoteStatus(id);
            setHasVoted(voteStatus.hasVoted);
          } catch (err) {
            console.error("Failed to check vote status:", err);
          }
        }

        // Always fetch results for completed elections
        if (data.status === "completed") {
          setIsLoadingResults(true);
          try {
            const resultsData = await electionService.getElectionResults(id);
            setResults(resultsData);
          } catch (err) {
            console.error("Failed to fetch results:", err);
            toast({
              title: "Error",
              description: "Failed to load election results",
              variant: "destructive",
            });
          } finally {
            setIsLoadingResults(false);
          }
        }
      } catch (error: any) {
        setError(error.message || "Failed to load election details");
        toast({
          title: "Error",
          description: error.message || "Failed to load election details",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchElection();
  }, [id, isAuthenticated]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  };

  const handleVoteSubmit = async () => {
    if (!selectedCandidate || !election || !id) {
      toast({
        title: "Error",
        description: "Invalid election or candidate selection",
        variant: "destructive",
      });
      return;
    }

    setShowConfirmDialog(false);
    setIsSubmitting(true);

    try {
      console.log('Submitting vote:', {
        electionId: id,
        candidateId: selectedCandidate
      });

      // Submit vote
      await electionService.submitVote(id, selectedCandidate);
      
      // Update local state
      setHasVoted(true);
      
      // Show success message
      toast({
        title: "Vote submitted successfully!",
        description: "Thank you for participating in this election.",
      });
      
      // Refresh election data
      const updatedElection = await electionService.getElectionDetails(id);
      if (updatedElection) {
        setElection(updatedElection);
        
        // If election is now completed, fetch results
        if (updatedElection.status === "completed") {
          setIsLoadingResults(true);
          try {
            const resultsData = await electionService.getElectionResults(id);
            setResults(resultsData);
          } catch (err) {
            console.error("Failed to fetch results:", err);
          } finally {
            setIsLoadingResults(false);
          }
        }
      }
      
      // Navigate after successful vote and data refresh
      setTimeout(() => {
        navigate("/dashboard");
      }, 1500);
    } catch (err: any) {
      console.error('Vote submission error:', err);
      const errorMessage = err.response?.data?.message || "Failed to submit your vote. Please try again.";
      toast({
        title: "Vote submission failed",
        description: errorMessage,
        variant: "destructive",
      });
      
      // If error is due to already voted, update local state
      if (err.response?.status === 400 && errorMessage.includes("already voted")) {
        setHasVoted(true);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVoteClick = () => {
    if (!isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "Please log in to cast your vote",
        variant: "destructive",
      });
      navigate("/login", { state: { message: "Please log in to cast your vote" } });
      return;
    }
    setShowConfirmDialog(true);
  };

  const renderResults = () => {
    if (!results) return null;

    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Election Results</h2>
          {results.isMockData && (
            <Badge variant="outline" className="text-yellow-600 border-yellow-600">
              Mock Data
            </Badge>
          )}
        </div>
        
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-gray-600">Total Votes:</span>
            <span className="font-semibold">{results.totalVotes}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Last Updated:</span>
            <span className="font-semibold">
              {new Date(results.lastUpdated).toLocaleString()}
            </span>
          </div>
        </div>

        {results.isMockData && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-6">
            <p className="text-yellow-800">
              This is mock data generated for testing purposes. Real results will be shown when votes are cast.
            </p>
          </div>
        )}

        {results.isTie && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-6">
            <p className="text-yellow-800 font-medium">
              This election resulted in a tie between {results.winners.length} candidates!
            </p>
          </div>
        )}

        <div className="space-y-4">
          {results.results.map((result: any) => (
            <div 
              key={result.candidate.id}
              className={`p-4 rounded-lg border ${
                results.winners.some((w: any) => w.id === result.candidate.id)
                  ? 'border-green-200 bg-green-50'
                  : 'border-gray-200'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-semibold">{result.candidate.name}</h3>
                  <p className="text-sm text-gray-600">{result.candidate.party}</p>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{result.votes} votes</div>
                  <div className="text-sm text-gray-600">
                    {result.percentage.toFixed(1)}%
                  </div>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full"
                  style={{ width: `${result.percentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading election details...</p>
        </div>
      </div>
    );
  }

  if (error || !election) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">{error || "Election not found"}</p>
          <Button 
            className="mt-4"
            onClick={() => navigate("/dashboard")}
          >
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const isActive = election.status === "active";
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {isLoading ? (
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading election details...</p>
          </div>
        ) : error ? (
          <div className="text-center text-red-600">
            <p>{error}</p>
            <Button onClick={() => navigate(-1)} className="mt-4">
              Go Back
            </Button>
          </div>
        ) : election ? (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <Button variant="ghost" onClick={() => navigate(-1)}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              {isAdmin && election.status === "upcoming" && (
                <Button variant="destructive" onClick={() => setShowDeleteDialog(true)}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              )}
            </div>

            <Card>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-2xl">{election.title}</CardTitle>
                    <CardDescription className="mt-2">
                      {election.description}
                    </CardDescription>
                  </div>
                  <Badge className={cn(
                    election.status === "active" && "bg-green-500",
                    election.status === "upcoming" && "bg-blue-500",
                    election.status === "completed" && "bg-gray-500"
                  )}>
                    {election.status.charAt(0).toUpperCase() + election.status.slice(1)}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent>
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Start Date</h3>
                      <p className="mt-1">{formatDate(election.startDate)}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">End Date</h3>
                      <p className="mt-1">{formatDate(election.endDate)}</p>
                    </div>
                  </div>

                  {election.status === "completed" ? (
                    isLoadingResults ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                        <p className="mt-4 text-gray-600">Loading results...</p>
                      </div>
                    ) : (
                      renderResults()
                    )
                  ) : election.status === "active" ? (
                    isAuthenticated ? (
                      hasVoted ? (
                        <div className="bg-green-50 border border-green-200 rounded-md p-4">
                          <p className="text-green-800">
                            You have already voted in this election. Results will be available once the election is completed.
                          </p>
                        </div>
                      ) : (
                        <div>
                          <h3 className="text-lg font-semibold mb-4">Cast Your Vote</h3>
                          <div className="space-y-4">
                            {election.candidates.map((candidate) => (
                              <div
                                key={candidate._id}
                                className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                                  selectedCandidate === candidate._id
                                    ? "border-blue-500 bg-blue-50"
                                    : "border-gray-200 hover:border-blue-200"
                                }`}
                                onClick={() => setSelectedCandidate(candidate._id)}
                              >
                                <div className="flex items-start justify-between">
                                  <div>
                                    <h4 className="font-medium">{candidate.name}</h4>
                                    <p className="text-sm text-gray-600">
                                      {candidate.party}
                                    </p>
                                  </div>
                                  <div
                                    className={`w-4 h-4 rounded-full border ${
                                      selectedCandidate === candidate._id
                                        ? "border-4 border-blue-500"
                                        : "border-gray-300"
                                    }`}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                          <Button
                            className="w-full mt-6"
                            disabled={!selectedCandidate || isSubmitting}
                            onClick={() => setShowConfirmDialog(true)}
                          >
                            {isSubmitting ? "Submitting..." : "Submit Vote"}
                          </Button>
                        </div>
                      )
                    ) : (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                        <p className="text-yellow-800">
                          Please log in to cast your vote in this election.
                        </p>
                        <Button
                          variant="outline"
                          className="mt-4"
                          onClick={() => navigate("/login")}
                        >
                          Log In
                        </Button>
                      </div>
                    )
                  ) : (
                    <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                      <p className="text-blue-800">
                        This election has not started yet. Please check back on{" "}
                        {formatDate(election.startDate)}.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        ) : null}
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Your Vote</DialogTitle>
            <DialogDescription>
              Are you sure you want to cast your vote? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            {selectedCandidate && (
              <div className="p-4 bg-gray-50 rounded-md">
                <p className="font-medium">
                  {
                    election?.candidates.find(
                      (c) => c._id === selectedCandidate
                    )?.name
                  }
                </p>
                <p className="text-sm text-gray-600">
                  {
                    election?.candidates.find(
                      (c) => c._id === selectedCandidate
                    )?.party
                  }
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleVoteSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Submitting..." : "Confirm Vote"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ElectionDetails;