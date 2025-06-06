import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { ArrowLeft, Plus, Trash2, AlertCircle } from "lucide-react";
import { electionService, Candidate } from "@/services/api";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const candidateSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  party: z.string().min(2, "Party must be at least 2 characters"),
  bio: z.string().min(10, "Bio must be at least 10 characters"),
});

const formSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
});

type FormValues = z.infer<typeof formSchema>;

const EditElection = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [newCandidate, setNewCandidate] = useState<Candidate>({
    name: "",
    party: "",
    bio: "",
  });
  const [candidateError, setCandidateError] = useState<string | null>(null);
  const [isUpcoming, setIsUpcoming] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      startDate: "",
      endDate: "",
    },
  });

  useEffect(() => {
    const fetchElection = async () => {
      try {
        if (!id) return;
        const election = await electionService.getElectionDetails(id);
        
        // Format dates for input
        const startDate = new Date(election.startDate)
          .toISOString()
          .split('T')[0];
        const endDate = new Date(election.endDate)
          .toISOString()
          .split('T')[0];
        
        // Check if election is upcoming
        const now = new Date();
        const isUpcoming = now < new Date(election.startDate);
        setIsUpcoming(isUpcoming);

        form.reset({
          title: election.title,
          description: election.description,
          startDate,
          endDate,
        });

        setCandidates(election.candidates);
      } catch (error: any) {
        console.error('Error fetching election:', error);
        toast({
          title: "Error",
          description: error.response?.data?.message || "Failed to load election details",
          variant: "destructive",
        });
        navigate('/admin/dashboard');
      } finally {
        setIsLoading(false);
      }
    };

    fetchElection();
  }, [id, form, navigate]);

  const validateCandidate = (candidate: Candidate) => {
    try {
      candidateSchema.parse(candidate);
      return null;
    } catch (error) {
      if (error instanceof z.ZodError) {
        return error.errors[0].message;
      }
      return "Invalid candidate data";
    }
  };

  const handleAddCandidate = () => {
    const error = validateCandidate(newCandidate);
    if (error) {
      setCandidateError(error);
      return;
    }

    setCandidates([...candidates, newCandidate]);
    setNewCandidate({ name: "", party: "", bio: "" });
    setCandidateError(null);
  };

  const handleRemoveCandidate = (index: number) => {
    const newCandidates = [...candidates];
    newCandidates.splice(index, 1);
    setCandidates(newCandidates);
  };

  const onSubmit = async (data: FormValues) => {
    if (!id) return;
    
    if (candidates.length < 2) {
      toast({
        title: "Error",
        description: "At least two candidates are required",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      const updateData = {
        title: data.title,
        description: data.description,
        startDate: data.startDate,
        endDate: data.endDate,
        candidates
      };
      
      await electionService.updateElection(id, updateData);
      
      toast({
        title: "Success",
        description: "Election updated successfully",
      });
      navigate('/admin/dashboard');
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to update election",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
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

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <Button 
          variant="ghost" 
          className="mb-8" 
          onClick={() => navigate("/admin/dashboard")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>

        <div className="bg-white shadow-md rounded-lg p-6">
          <h1 className="text-2xl font-bold mb-6">Edit Election</h1>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter election title" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Enter election description" 
                        className="min-h-[100px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {isUpcoming && (
                <div className="space-y-6">
                  <div className="border-t pt-6">
                    <h2 className="text-lg font-semibold mb-4">Candidates</h2>
                    
                    {/* Existing Candidates */}
                    <div className="space-y-4 mb-6">
                      {candidates.map((candidate, index) => (
                        <div key={index} className="flex items-start gap-4 p-4 border rounded-lg">
                          <div className="flex-1">
                            <h3 className="font-medium">{candidate.name}</h3>
                            <p className="text-sm text-gray-600">{candidate.party}</p>
                            <p className="text-sm mt-1">{candidate.bio}</p>
                          </div>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remove Candidate</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to remove {candidate.name}? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-red-500 hover:bg-red-600"
                                  onClick={() => handleRemoveCandidate(index)}
                                >
                                  Remove
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      ))}
                    </div>

                    {/* Add New Candidate */}
                    <div className="space-y-4 border-t pt-4">
                      <h3 className="text-md font-medium">Add New Candidate</h3>
                      <div className="space-y-4">
                        <Input
                          placeholder="Candidate Name"
                          value={newCandidate.name}
                          onChange={(e) => setNewCandidate({ ...newCandidate, name: e.target.value })}
                        />
                        <Input
                          placeholder="Party"
                          value={newCandidate.party}
                          onChange={(e) => setNewCandidate({ ...newCandidate, party: e.target.value })}
                        />
                        <Textarea
                          placeholder="Bio"
                          value={newCandidate.bio}
                          onChange={(e) => setNewCandidate({ ...newCandidate, bio: e.target.value })}
                          className="min-h-[80px]"
                        />
                        {candidateError && (
                          <div className="flex items-center gap-2 text-red-500 text-sm">
                            <AlertCircle className="h-4 w-4" />
                            <span>{candidateError}</span>
                          </div>
                        )}
                        <Button
                          type="button"
                          onClick={handleAddCandidate}
                          className="w-full"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Candidate
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="flex justify-end gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/admin/dashboard")}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Updating..." : "Update Election"}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
};

export default EditElection; 