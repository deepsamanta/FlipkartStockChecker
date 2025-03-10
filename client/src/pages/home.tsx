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
import { Check, X, Loader2 } from "lucide-react";

export default function Home() {
  const { toast } = useToast();
  const [results, setResults] = useState<PincodeAvailability[]>([]);
  
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="space-y-4 text-center">
          <div className="flex items-center justify-center gap-2">
            <SiFlipkart className="w-8 h-8 text-primary" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Flipkart Availability Checker
            </h1>
          </div>
          <p className="text-muted-foreground">
            Check product availability across major Indian cities
          </p>
        </div>

        <Card className="p-6">
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
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button 
                type="submit" 
                className="w-full"
                disabled={checkMutation.isPending}
              >
                {checkMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Checking...
                  </>
                ) : "Check Availability"}
              </Button>
            </form>
          </Form>
        </Card>

        {results.length > 0 && (
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Availability Results</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {results.map((result) => (
                <Card 
                  key={result.pincode}
                  className="p-4 flex items-center justify-between"
                >
                  <div>
                    <div className="font-medium">{result.city}</div>
                    <div className="text-sm text-muted-foreground">
                      {result.state} - {result.pincode}
                    </div>
                  </div>
                  {result.isAvailable ? (
                    <Check className="h-5 w-5 text-green-500" />
                  ) : (
                    <X className="h-5 w-5 text-red-500" />
                  )}
                </Card>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
