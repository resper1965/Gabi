#!/bin/bash
# Script de conveniencia para rodar no Cloud Shell:
gcloud sql connect nghost-db --user=postgres << ISQL
UPDATE users SET role = 'superadmin' WHERE email = 'resper@ness.com.br';
ISQL
