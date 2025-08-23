import google.generativeai as genai

api_key = "AIzaSyDRATpNvG_tJgmInd6Iyn8xAtz1i06uQk0"
genai.configure(api_key=api_key)

try:
    for model in genai.list_models():
        if 'generateContent' in model.supported_generation_methods:
            print(f"Model: {model.name}")
            print(f"  Display Name: {model.display_name}")
            print(f"  Description: {model.description}")
            print()
except Exception as e:
    print("Error listing models:", str(e))