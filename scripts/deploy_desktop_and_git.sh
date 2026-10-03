#!/bin/bash
set -e
echo "🚀 Copiando zips atualizados para a Área de Trabalho (Desktop)..."
cp -f "/Users/essencialcosmeticos/.gemini/antigravity/scratch/dashboarding-carla/site-hostinger-public_html.zip" "/Users/essencialcosmeticos/Desktop/"
cp -f "/Users/essencialcosmeticos/.gemini/antigravity/scratch/dashboarding-carla/sistema-yasmin-otica-02-10-2026.zip" "/Users/essencialcosmeticos/Desktop/"
echo "✅ Arquivos .zip atualizados no Desktop com sucesso!"

echo "🚀 Enviando commits para o repositório remoto yasminotica..."
git push yasminotica main
echo "✅ Git push concluído no remoto yasminotica (branch main)!"
