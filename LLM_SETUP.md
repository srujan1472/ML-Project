# Local LLM Integration Setup Guide

## Overview
This application now includes AI-powered ingredient analysis using your local LLM model. When you extract text from food product images using OCR, you can now analyze the ingredients with your local AI model.

## Prerequisites

1. **Ollama** - Download and install from [https://ollama.ai/](https://ollama.ai/)
2. **A compatible LLM model** - Such as Llama 2, Mistral, CodeLlama, etc.

## Setup Instructions

### 1. Install Ollama
```bash
# Download and install Ollama for your operating system
# Visit: https://ollama.ai/download
```

### 2. Pull a Model
```bash
# Pull Llama 2 (recommended for ingredient analysis)
ollama pull llama2

# Or pull other models
ollama pull mistral
ollama pull codellama
ollama pull llama3.2
```

### 3. Start Ollama Service
```bash
# Start the Ollama service
ollama serve
```

The service will run on `http://localhost:11434/` by default.

### 4. Verify Installation
```bash
# Check available models
curl http://localhost:11434/api/tags

# Test the model
curl -X POST http://localhost:11434/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "model": "llama2",
    "prompt": "Hello, how are you?",
    "stream": false
  }'
```

## Using the Feature

### 1. Extract Text with OCR
- Go to the **Dashboard** page
- Upload an image of food ingredients or use the camera
- Click **"Extract Text"** to get the ingredient list

### 2. Analyze with AI
- After text extraction, click **"Analyze with AI"** button
- This will redirect you to the **Ingredient Analysis** page
- Select your preferred model from the dropdown
- The AI will analyze the ingredients and provide detailed information

### 3. Analysis Results
The AI will provide analysis covering:
- Common uses of the ingredients
- Health benefits or concerns
- Natural vs artificial classification
- Potential allergens or sensitivities
- Nutritional value and impact

## Troubleshooting

### Model Not Found
- Make sure you've pulled the model: `ollama pull modelname`
- Check available models: `ollama list`
- Verify the model name in the dropdown matches exactly

### Connection Error
- Ensure Ollama is running: `ollama serve`
- Check if the service is accessible: `curl http://localhost:11434/api/tags`
- Verify no firewall is blocking port 11434

### Slow Response
- Try a smaller/faster model
- Adjust the `max_tokens` parameter in the code
- Consider using a more powerful machine

## Model Recommendations

### For Ingredient Analysis:
- **Llama 2** - Good balance of speed and accuracy
- **Mistral** - Fast and efficient
- **Llama 3.2** - Latest and most capable (requires more resources)

### For Better Results:
- Use models with 7B+ parameters for better understanding
- Ensure the model has been trained on general knowledge
- Consider fine-tuning for food/health domain if needed

## API Endpoints Used

- `GET /api/tags` - List available models
- `POST /api/generate` - Generate text with selected model

## Customization

You can modify the analysis prompt in `src/app/analysis/page.js`:

```javascript
const prompt = `Please analyze these ingredients and provide detailed information about them in about 10 lines. Focus on:

1. What these ingredients are commonly used for
2. Any potential health benefits or concerns
3. Whether they are natural or artificial
4. Any allergens or sensitivities they might cause
5. Nutritional value or impact

Ingredients to analyze:
${text}

Please provide a comprehensive analysis in about 10 lines:`;
```

## Security Notes

- The LLM runs locally on your machine
- No data is sent to external servers
- All analysis is performed offline
- Your ingredient data remains private

## Performance Tips

1. **Use SSD storage** for faster model loading
2. **Allocate sufficient RAM** (8GB+ recommended)
3. **Use GPU acceleration** if available
4. **Close other applications** when running large models
5. **Monitor system resources** during analysis
