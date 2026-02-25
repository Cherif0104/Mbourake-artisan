# Deploie la fonction Edge "delete-my-account" sur le projet Supabase.
# Prealable : ouvrir un terminal et lancer une fois "npx supabase login" (connexion navigateur).
# Puis executer ce script depuis la racine du projet : .\scripts\deploy-delete-my-account.ps1

$ProjectRef = "snhoxuqaskgoownshvgr"
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

Write-Host "Deploiement de delete-my-account sur le projet $ProjectRef..." -ForegroundColor Cyan
npx supabase functions deploy delete-my-account --project-ref $ProjectRef --no-verify-jwt
if ($LASTEXITCODE -eq 0) {
    Write-Host "Fonction deployee. Tu peux retester Supprimer mon compte dans l'app." -ForegroundColor Green
} else {
    Write-Host "Echec. As-tu lance 'npx supabase login' ?" -ForegroundColor Yellow
}
