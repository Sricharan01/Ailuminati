import { securityService } from './securityService';

interface AzureAIResult {
  extractedText: string;
  confidence: number;
  pages: PageResult[];
  tables: TableResult[];
  keyValuePairs: KeyValuePair[];
  processingTime: number;
}

interface PageResult {
  pageNumber: number;
  width: number;
  height: number;
  lines: LineResult[];
  words: WordResult[];
}

interface LineResult {
  content: string;
  boundingBox: number[];
}

interface WordResult {
  content: string;
  boundingBox: number[];
  confidence: number;
}

interface TableResult {
  rowCount: number;
  columnCount: number;
  cells: TableCell[];
}

interface TableCell {
  content: string;
  rowIndex: number;
  columnIndex: number;
}

interface KeyValuePair {
  key: {
    content: string;
  };
  value: {
    content: string;
  };
  confidence: number;
}

class AzureAIService {
  private endpoint = 'https://spark-01.cognitiveservices.azure.com/';
  private apiKey = 'DzYSXfu4Bd4xmGOYBd8H5gLlJr1v2L0ltdzimXuLXjpSop2uqEYiJQQJ99BFACYeBjFXJ3w3AAALACOGfoJq';
  private apiVersion = '2023-07-31';

  async processDocument(file: File, userId: string): Promise<AzureAIResult> {
    const startTime = Date.now();

    try {
      // Log processing start
      securityService.logAction(
        userId,
        'azure_ai_processing_start',
        'document',
        file.name,
        { 
          fileSize: file.size, 
          fileType: file.type,
          endpoint: this.endpoint
        }
      );

      // Convert file to base64
      const base64Data = await this.fileToBase64(file);

      // Analyze document with Azure AI
      const analysisResult = await this.analyzeDocument(base64Data);

      // Extract text content
      const extractedText = this.extractFullText(analysisResult);

      const processingTime = Date.now() - startTime;

      const result: AzureAIResult = {
        extractedText,
        confidence: this.calculateOverallConfidence(analysisResult),
        pages: analysisResult.pages || [],
        tables: analysisResult.tables || [],
        keyValuePairs: analysisResult.keyValuePairs || [],
        processingTime
      };

      // Log successful processing
      securityService.logAction(
        userId,
        'azure_ai_processing_complete',
        'document',
        file.name,
        {
          confidence: result.confidence,
          textLength: result.extractedText.length,
          processingTime
        }
      );

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Azure AI processing failed';
      
      // Log processing error
      securityService.logAction(
        userId,
        'azure_ai_processing_error',
        'document',
        file.name,
        { error: errorMessage }
      );

      throw new Error(`Azure AI processing failed: ${errorMessage}`);
    }
  }

  private async analyzeDocument(base64Data: string): Promise<any> {
    const analyzeUrl = `${this.endpoint}formrecognizer/documentModels/prebuilt-document:analyze?api-version=${this.apiVersion}`;

    const response = await fetch(analyzeUrl, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': this.apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        base64Source: base64Data
      })
    });

    if (!response.ok) {
      throw new Error(`Azure AI API error: ${response.status} ${response.statusText}`);
    }

    // Get operation location for polling
    const operationLocation = response.headers.get('Operation-Location');
    if (!operationLocation) {
      throw new Error('No operation location returned from Azure AI API');
    }

    // Poll for results
    return await this.pollForResults(operationLocation);
  }

  private async pollForResults(operationLocation: string): Promise<any> {
    const maxAttempts = 30;
    const pollInterval = 2000; // 2 seconds

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const response = await fetch(operationLocation, {
        headers: {
          'Ocp-Apim-Subscription-Key': this.apiKey
        }
      });

      if (!response.ok) {
        throw new Error(`Polling error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();

      if (result.status === 'succeeded') {
        return result.analyzeResult;
      } else if (result.status === 'failed') {
        throw new Error(`Document analysis failed: ${result.error?.message || 'Unknown error'}`);
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    throw new Error('Document analysis timed out');
  }

  private extractFullText(analysisResult: any): string {
    if (analysisResult.content) {
      return analysisResult.content;
    }

    // Fallback: extract from pages
    if (analysisResult.pages) {
      return analysisResult.pages
        .map((page: any) => 
          page.lines?.map((line: any) => line.content).join('\n') || ''
        )
        .join('\n\n');
    }

    return '';
  }

  private calculateOverallConfidence(analysisResult: any): number {
    if (analysisResult.pages) {
      let totalConfidence = 0;
      let wordCount = 0;
      
      for (const page of analysisResult.pages) {
        if (page.words) {
          for (const word of page.words) {
            totalConfidence += word.confidence || 0.8;
            wordCount++;
          }
        }
      }
      
      return wordCount > 0 ? totalConfidence / wordCount : 0.8;
    }
    
    return 0.8; // Default confidence
  }

  private async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async checkServiceHealth(): Promise<boolean> {
    try {
      const healthUrl = `${this.endpoint}formrecognizer/documentModels?api-version=${this.apiVersion}`;
      
      const response = await fetch(healthUrl, {
        method: 'GET',
        headers: {
          'Ocp-Apim-Subscription-Key': this.apiKey
        }
      });
      
      return response.ok;
    } catch (error) {
      console.error('Azure AI service health check failed:', error);
      return false;
    }
  }
}

export const azureAIService = new AzureAIService();
export type { AzureAIResult };