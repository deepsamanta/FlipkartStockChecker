import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { urlSchema, type PincodeAvailability } from "@shared/schema";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { SiFlipkart } from "react-icons/si";
import { Check, X, Loader2, Search } from "lucide-react";

export default function Home() {
  const { toast } = useToast();
  const [results, setResults] = useState<PincodeAvailability[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const form = useForm({
    resolver: zodResolver(urlSchema),
    defaultValues: {
      url: ""
    }
  });

  const checkMutation = useMutation({
    mutationFn: async (url: string) => {
      const res = await apiRequest("POST", "/api/check-availability", { url });
      return res.json();
    },
    onSuccess: (data) => {
      setResults(data.results);
      if (data.cached) {
        toast({
          title: "Showing cached results",
          description: "These results are from our cache and may be up to 15 minutes old",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error checking availability",
        description: error.message
      });
    }
  });

  const filteredResults = results.filter(result => {
    const searchLower = searchQuery.toLowerCase();
    return (
      result.city.toLowerCase().includes(searchLower) ||
      result.state.toLowerCase().includes(searchLower) ||
      result.pincode.includes(searchQuery)
    );
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="space-y-4 text-center">
          <div className="flex items-center justify-center gap-2">
            <SiFlipkart className="w-10 h-10 text-primary" />
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Flipkart Availability Checker
            </h1>
          </div>
          <p className="text-lg text-muted-foreground">
            Check product availability across major Indian cities instantly
          </p>
        </div>

        <Card className="p-6 shadow-lg border-2">
          <Form {...form}>
            <form 
              onSubmit={form.handleSubmit((data) => checkMutation.mutate(data.url))}
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="url"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        placeholder="Enter Flipkart product URL..."
                        className="text-lg p-6"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button 
                type="submit" 
                className="w-full text-lg p-6"
                disabled={checkMutation.isPending}
              >
                {checkMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Checking Availability...
                  </>
                ) : "Check Availability"}
              </Button>
            </form>
          </Form>
        </Card>

        {results.length > 0 && (
          <Card className="p-6 shadow-lg">
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <h2 className="text-2xl font-semibold">Availability Results</h2>
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
                  <Input
                    placeholder="Search by city or state..."
                    className="pl-10"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredResults.map((result) => (
                  <Card 
                    key={result.pincode}
                    className={`p-4 transition-colors ${
                      result.isAvailable 
                        ? 'bg-green-50 dark:bg-green-950/20 border-green-200' 
                        : 'bg-red-50 dark:bg-red-950/20 border-red-200'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-lg font-medium">{result.city}</div>
                        <div className="text-sm text-muted-foreground">
                          {result.state}
                        </div>
                        <div className="text-sm font-mono mt-1">{result.pincode}</div>
                      </div>
                      {result.isAvailable ? (
                        <Check className="h-6 w-6 text-green-600" />
                      ) : (
                        <X className="h-6 w-6 text-red-600" />
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}