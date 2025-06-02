import React from 'react';
import { CreateCampaignForm } from '../components/CreateCampaignForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import { InfoIcon } from 'lucide-react';
import { Layout } from '../components/Layout';

export function CreateCampaignPage() {
  return (
    <Layout>
      <div className="min-h-screen bg-dark-gradient">
        <div className="container mx-auto py-8 max-w-4xl px-6">
          <div className="space-y-8">
        <div>
          <h1 className="heading-dark-1">Create Campaign</h1>
          <p className="text-gray-400 mt-2 text-lg">
            Start a crowdfunding campaign to purchase DexScreener services for your favorite token
          </p>
        </div>

        <div className="card-dark p-6 border border-purple-500/30">
          <div className="flex items-start space-x-3">
            <InfoIcon className="h-5 w-5 text-purple-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-purple-400 font-medium mb-2">Important Information</p>
              <p className="text-gray-300 text-sm leading-relaxed">
                Campaign funds are held in a unique Solana wallet. 
                Once the target is reached, the service will be automatically purchased. 
                If the deadline passes without reaching the target, all contributors will be refunded.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card-dark p-6 hover-lift-dark">
            <div className="space-y-4">
              <div>
                <h3 className="heading-dark-3">Enhanced Token Info</h3>
                <p className="text-purple-400 font-semibold">$299 USDC</p>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed">
                Add detailed token information, social links, and descriptions to DexScreener
              </p>
            </div>
          </div>

          <div className="card-dark p-6 hover-lift-dark">
            <div className="space-y-4">
              <div>
                <h3 className="heading-dark-3">Token Advertising</h3>
                <p className="text-blue-400 font-semibold">Custom Budget</p>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed">
                Promote your token with banner ads and featured placements on DexScreener
              </p>
            </div>
          </div>

          <div className="card-dark p-6 hover-lift-dark">
            <div className="space-y-4">
              <div>
                <h3 className="heading-dark-3">DexScreener Boost</h3>
                <p className="text-green-400 font-semibold">Variable Pricing</p>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed">
                Boost your token's visibility with trending placement and increased exposure
              </p>
            </div>
          </div>
        </div>

        <div className="card-dark p-8 glow-purple">
          <div className="space-y-6">
            <div>
              <h2 className="heading-dark-2">Campaign Details</h2>
              <p className="text-gray-400 mt-2">
                Fill in the information below to create your crowdfunding campaign
              </p>
            </div>
            <CreateCampaignForm />
          </div>
            </div>
        </div>
      </div>
      </div>
    </Layout>
  );
}