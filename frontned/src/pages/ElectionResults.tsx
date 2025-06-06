import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Trophy } from "lucide-react";
import { electionService } from "@/services/api";

type Candidate = {
  id: string;
  name: string;
  party: string;
  bio: string;
};

type ElectionResult = {
  electionId: string;
  title: string;
  description: string;
  totalVotes: number;
  results: Array<{
    candidate: Candidate;
    votes: number;
    percentage: number;
  }>;
  winners: Candidate[];
  isTie: boolean;
  endDate: string;
  lastUpdated: string;
};

const ElectionResults = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [isLoading, setIsLoading] = useState(true);
  const [results, setResults] = useState<ElectionResult | null>(null);

  useEffect(() => {
    const fetchResults = async () => {
      try {
        if (!id) return;
        const data = await electionService.getElectionResults(id);
        setResults(data);
      } catch (error: any) {
        console.error('Error fetching results:', error);
        toast({
          title: "Error",
          description: error.response?.data?.message || "Failed to load election results",
          variant: "destructive",
        });
        navigate(-1);
      } finally {
        setIsLoading(false);
      }
    };

    fetchResults();
  }, [id, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading election results...</p>
        </div>
      </div>
    );
  }

  if (!results) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-gray-600">No results found</p>
          <Button 
            variant="link" 
            onClick={() => navigate(-1)} 
            className="mt-4"
          >
            Go back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Button 
          variant="ghost" 
          className="mb-8" 
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h1 className="text-2xl font-bold mb-2">{results.title}</h1>
            <p className="text-gray-600">{results.description}</p>
            <div className="mt-4 text-sm text-gray-500">
              <p>End Date: {new Date(results.endDate).toLocaleDateString()}</p>
              <p className="mt-2">Total Votes Cast: {results.totalVotes}</p>
              <p className="text-xs mt-1">Last Updated: {new Date(results.lastUpdated).toLocaleString()}</p>
            </div>
          </div>

          {results.winners.length > 0 && (
            <Card className={results.isTie ? "bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200" : "bg-gradient-to-r from-yellow-50 to-yellow-100 border-yellow-200"}>
              <CardHeader>
                <CardTitle className={`flex items-center ${results.isTie ? "text-blue-800" : "text-yellow-800"}`}>
                  <Trophy className={`h-5 w-5 mr-2 ${results.isTie ? "text-blue-600" : "text-yellow-600"}`} />
                  {results.isTie ? "Tie Result" : "Winner"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`grid gap-4 ${results.isTie ? "md:grid-cols-2" : ""}`}>
                  {results.winners.map((winner) => (
                    <div key={winner.id} className="space-y-2">
                      <p className="text-xl font-semibold">{winner.name}</p>
                      <p className="text-gray-600">{winner.party}</p>
                      <p className="text-sm text-gray-500">{winner.bio}</p>
                      {results.results.map(result => {
                        if (result.candidate.id === winner.id) {
                          return (
                            <p key={result.candidate.id} className="text-sm font-medium">
                              Votes: {result.votes} ({result.percentage.toFixed(1)}%)
                            </p>
                          );
                        }
                        return null;
                      })}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            {results.results
              .filter(result => !results.winners.some(w => w.id === result.candidate.id))
              .map((result) => (
                <Card key={result.candidate.id}>
                  <CardHeader>
                    <CardTitle className="text-lg">{result.candidate.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p className="text-gray-600">{result.candidate.party}</p>
                      <p className="text-sm text-gray-500 line-clamp-2">{result.candidate.bio}</p>
                      <p className="text-sm">
                        Votes: {result.votes} ({result.percentage.toFixed(1)}%)
                      </p>
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div
                          className="bg-blue-600 h-2.5 rounded-full"
                          style={{ width: `${result.percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ElectionResults; 