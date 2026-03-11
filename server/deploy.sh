#!/bin/bash
set -x
gcloud run deploy eltekkeya-api --source . --region us-central1 --allow-unauthenticated --project=eltekkeya
